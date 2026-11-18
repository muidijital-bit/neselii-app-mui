-- Adım 7: Takas ve araç alım süreci.
--  Madde 35: Takas ön başvurusu (talep konusu 'trade_in' + araç bilgileri)
--  Madde 36: Dış / iç / motor / kasa fotoğraf ve videoları (özel depolama alanı 'trade-in')
--  Madde 37: Danışmanın ön değerlendirme aralığı → müşteriye bildirim
--  Madde 38: Takas farkı (uygulamada hesaplanır: ilan fiyatı − değerlendirme aralığı)
--  Madde 39: Takas aracı ekspertiz randevusu (mevcut randevu yapısı + randevu yeri)
--  Madde 40: Araç satın alma talebi (talep konusu 'sell_vehicle', ayrı listede)
alter table public.leads drop constraint leads_topic_check;
alter table public.leads add constraint leads_topic_check check (
  topic in ('info', 'financing', 'video_call', 'inspection', 'expertise', 'insurance', 'fleet_quote', 'reservation', 'trade_in', 'sell_vehicle')
);

create or replace function private.lead_topic_label(p_topic text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_topic
    when 'financing' then 'Finansman'
    when 'video_call' then 'Görüntülü inceleme'
    when 'inspection' then 'Yerinde inceleme'
    when 'expertise' then 'Ekspertiz'
    when 'insurance' then 'Sigorta / kasko'
    when 'fleet_quote' then 'Toplu teklif'
    when 'reservation' then 'Rezervasyon'
    when 'trade_in' then 'Takas'
    when 'sell_vehicle' then 'Araç satış'
    else 'Bilgi'
  end;
$$;

-- Madde 39: randevu yeri (ör. "Firmamızda", "Müşterinin adresinde").
alter table public.leads add column appointment_location text check (appointment_location is null or length(appointment_location) <= 120);
grant update (appointment_location) on public.leads to authenticated;

-- Müşterinin aracı (takas / satış).
create table public.trade_ins (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  category_slug text not null check (category_slug in ('kamyon', 'cekici', 'dorse', 'ticari-arac')),
  brand text not null check (length(trim(brand)) between 1 and 60),
  model text check (model is null or length(model) <= 80),
  year int check (year is null or year between 1950 and 2100),
  km int check (km is null or km >= 0),
  damage_status text check (damage_status is null or damage_status in ('none', 'repaired', 'damaged')),
  expected_price numeric(14, 2) check (expected_price is null or expected_price >= 0),
  valuation_min numeric(14, 2) check (valuation_min is null or valuation_min >= 0),
  valuation_max numeric(14, 2) check (valuation_max is null or valuation_max >= 0),
  valuated_at timestamptz,
  created_at timestamptz not null default now(),
  check (valuation_min is null or valuation_max is null or valuation_min <= valuation_max)
);

alter table public.trade_ins enable row level security;

create policy "Müşteri kendi aracını, admin hepsini görür" on public.trade_ins
  for select to authenticated using (
    (select private.is_admin())
    or exists (select 1 from public.leads l where l.id = trade_ins.lead_id and l.user_id = (select auth.uid()))
  );
create policy "Müşteri kendi talebine araç ekler" on public.trade_ins
  for insert to authenticated with check (
    exists (select 1 from public.leads l where l.id = trade_ins.lead_id and l.user_id = (select auth.uid()) and l.topic in ('trade_in', 'sell_vehicle'))
  );
create policy "Admin değerlendirir" on public.trade_ins
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

revoke insert, update, delete on public.trade_ins from anon, authenticated;
grant insert (lead_id, category_slug, brand, model, year, km, damage_status, expected_price) on public.trade_ins to authenticated;
grant update (valuation_min, valuation_max) on public.trade_ins to authenticated;

create table public.trade_in_media (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.trade_ins (lead_id) on delete cascade,
  section text not null check (section in ('exterior', 'interior', 'engine', 'body')),
  kind text not null check (kind in ('photo', 'video')),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index trade_in_media_lead_idx on public.trade_in_media (lead_id, section);

alter table public.trade_in_media enable row level security;

create policy "Müşteri kendi medyasını, admin hepsini görür" on public.trade_in_media
  for select to authenticated using (
    (select private.is_admin())
    or exists (select 1 from public.leads l where l.id = trade_in_media.lead_id and l.user_id = (select auth.uid()))
  );
create policy "Müşteri kendi aracına medya ekler" on public.trade_in_media
  for insert to authenticated with check (
    exists (select 1 from public.leads l where l.id = trade_in_media.lead_id and l.user_id = (select auth.uid()))
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
  );

revoke update, delete on public.trade_in_media from anon, authenticated;

-- Özel depolama: <kullanıcı kimliği>/<talep kimliği>/<dosya>. Yalnız sahibi ve yönetici okur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-in', 'trade-in', false, 104857600, array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

create policy "Takas medyası: sahibi yükler" on storage.objects
  for insert to authenticated with check (bucket_id = 'trade-in' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Takas medyası: sahibi ve admin okur" on storage.objects
  for select to authenticated using (
    bucket_id = 'trade-in' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
  );

-- Madde 37: değerlendirme girilince/değişince zaman damgası ve müşteriye bildirim.
create or replace function private.prepare_trade_in_valuation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.valuation_min is distinct from old.valuation_min or new.valuation_max is distinct from old.valuation_max then
    new.valuated_at := case when new.valuation_min is null and new.valuation_max is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger trade_ins_prepare_valuation
  before update on public.trade_ins
  for each row execute function private.prepare_trade_in_valuation();

create or replace function private.format_tl(p_value numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(to_char(p_value, 'FM999,999,999,999'), ',', '.') || ' TL';
$$;

create or replace function private.notify_trade_in_valuation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead record;
begin
  if new.valuation_min is not distinct from old.valuation_min and new.valuation_max is not distinct from old.valuation_max then
    return null;
  end if;
  if new.valuation_min is null and new.valuation_max is null then
    return null;
  end if;
  select id, user_id, listing_id into v_lead from public.leads where id = new.lead_id;
  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (v_lead.user_id, 'lead_update', 'Aracınızın ön değerlendirmesi hazır',
          new.brand || coalesce(' ' || new.model, '') || ' · ' ||
          coalesce(private.format_tl(new.valuation_min), '') ||
          case when new.valuation_max is not null and new.valuation_max is distinct from new.valuation_min
               then ' – ' || private.format_tl(new.valuation_max) else '' end,
          v_lead.listing_id, v_lead.id);
  return null;
end;
$$;

create trigger trade_ins_notify_valuation
  after update on public.trade_ins
  for each row execute function private.notify_trade_in_valuation();

-- Randevu bildirimine yer bilgisi (madde 39).
create or replace function private.notify_lead_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  advisor_name text;
  title_text text := 'Talebiniz güncellendi';
  body_text text;
begin
  if new.status is not distinct from old.status
     and new.advisor_id is not distinct from old.advisor_id
     and new.appointment_at is not distinct from old.appointment_at
     and new.appointment_location is not distinct from old.appointment_location then
    return null;
  end if;

  if new.appointment_at is distinct from old.appointment_at
     or (new.appointment_at is not null and new.appointment_location is distinct from old.appointment_location) then
    if new.appointment_at is not null then
      title_text := case when old.appointment_at is null then 'Randevunuz oluşturuldu' else 'Randevunuz güncellendi' end;
      body_text := private.lead_topic_label(new.topic) || ' · ' || private.format_appointment(new.appointment_at)
                   || coalesce(' · ' || new.appointment_location, '');
    else
      body_text := private.lead_topic_label(new.topic) || ' randevunuz iptal edildi';
    end if;
  elsif new.status is distinct from old.status then
    body_text := private.lead_topic_label(new.topic) || ' talebi · ' || private.lead_status_label(new.status);
  elsif new.advisor_id is distinct from old.advisor_id then
    if new.advisor_id is null then
      return null;
    end if;
    select a.full_name into advisor_name from public.advisors a where a.id = new.advisor_id;
    body_text := 'Danışmanınız: ' || advisor_name;
  else
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (new.user_id, 'lead_update', title_text, body_text, new.listing_id, new.id);
  return null;
end;
$$;

-- Yönetici takas medyasını silebilir (temizlik / yanlış yükleme).
create policy "Takas medyası: admin siler" on storage.objects
  for delete to authenticated using (bucket_id = 'trade-in' and (select private.is_admin()));
