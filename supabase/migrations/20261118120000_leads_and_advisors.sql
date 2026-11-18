-- Talepler (Beni arayın / finansman / görüntülü inceleme) ve danışmanlar.
-- Müşteri ilan detayından talep bırakır; tetikleyici rastgele aktif bir danışman atar ve yöneticilere bildirim yazar.
-- Yönetici talebin durumunu ve danışmanını değiştirir; müşteriye "talebiniz güncellendi" bildirimi gider.

-- ---------------------------------------------------------------------------
-- Danışmanlar (müşteriye adı gösterilen firma çalışanları; giriş hesabı değildir)
-- ---------------------------------------------------------------------------
create table public.advisors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.advisors enable row level security;

create policy "Oturumlu kullanıcı danışmanları görür" on public.advisors
  for select to authenticated using (true);
create policy "Admin danışman yönetir" on public.advisors
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Başlangıç danışmanları (firma kendi ekibiyle değiştirecek).
insert into public.advisors (full_name) values ('Ahmet Yılmaz'), ('Mehmet Kaya'), ('Ayşe Demir');

-- ---------------------------------------------------------------------------
-- Talepler
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  topic text not null check (topic in ('info', 'financing', 'video_call')),
  preferred_date date,
  preferred_slot text not null default 'any' check (preferred_slot in ('morning', 'noon', 'afternoon', 'any')),
  contact_phone text not null check (length(trim(contact_phone)) >= 7),
  note text check (note is null or length(note) <= 1000),
  -- İleride hesaplayıcıdan gelen ödeme planı gibi ek bilgiler.
  data jsonb not null default '{}'::jsonb,
  advisor_id uuid references public.advisors (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_user_idx on public.leads (user_id, created_at desc);
create index leads_status_idx on public.leads (status, created_at desc);
create index leads_listing_idx on public.leads (listing_id);
create index leads_advisor_idx on public.leads (advisor_id);

alter table public.leads enable row level security;

create policy "Müşteri kendi taleplerini, admin hepsini görür" on public.leads
  for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "Müşteri kendi adına talep bırakır" on public.leads
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Admin talep günceller" on public.leads
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admin talep siler" on public.leads
  for delete to authenticated using ((select private.is_admin()));

-- Müşteri yalnızca form alanlarını yazar; durum ve danışman sunucuda belirlenir.
revoke insert, update on public.leads from anon, authenticated;
grant insert (user_id, listing_id, topic, preferred_date, preferred_slot, contact_phone, note, data) on public.leads to authenticated;
grant update (status, advisor_id) on public.leads to authenticated;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function private.set_updated_at();

-- Yeni talep: durum "Yeni", rastgele aktif danışman.
create or replace function private.prepare_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.status := 'new';
  new.contact_phone := trim(new.contact_phone);
  new.note := nullif(trim(coalesce(new.note, '')), '');
  if new.advisor_id is null then
    select a.id into new.advisor_id from public.advisors a where a.active order by random() limit 1;
  end if;
  return new;
end;
$$;

create trigger leads_prepare
  before insert on public.leads
  for each row execute function private.prepare_lead();

-- ---------------------------------------------------------------------------
-- Bildirimler: talep bağlantısı ve yeni türler
-- ---------------------------------------------------------------------------
alter table public.notifications add column lead_id uuid references public.leads (id) on delete cascade;
create index notifications_lead_idx on public.notifications (lead_id) where lead_id is not null;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in ('new_listing', 'price_change', 'status_change', 'message_reply', 'announcement', 'new_message', 'lead_new', 'lead_update')
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
    else 'Bilgi'
  end;
$$;

create or replace function private.lead_status_label(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'new' then 'Yeni'
    when 'in_progress' then 'Görüşülüyor'
    when 'completed' then 'Tamamlandı'
    when 'cancelled' then 'İptal edildi'
    else p_status
  end;
$$;

-- Yöneticilere: yeni talep.
create or replace function private.notify_admins_new_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_name text;
  listing_title text;
begin
  select coalesce(nullif(trim(p.full_name), ''), 'Müşteri') into customer_name from public.profiles p where p.id = new.user_id;
  select l.title into listing_title from public.listings l where l.id = new.listing_id;

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  select a.id, 'lead_new', 'Yeni talep: ' || coalesce(customer_name, 'Müşteri'),
         private.lead_topic_label(new.topic) || coalesce(' · ' || listing_title, ''), new.listing_id, new.id
    from public.profiles a
   where a.role = 'admin' and a.id is distinct from new.user_id;
  return null;
end;
$$;

create trigger leads_notify_admins
  after insert on public.leads
  for each row execute function private.notify_admins_new_lead();

-- Müşteriye: durum veya danışman değişti.
create or replace function private.notify_lead_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  advisor_name text;
  body_text text;
begin
  if new.status is not distinct from old.status and new.advisor_id is not distinct from old.advisor_id then
    return null;
  end if;

  select a.full_name into advisor_name from public.advisors a where a.id = new.advisor_id;

  if new.status is distinct from old.status then
    body_text := private.lead_topic_label(new.topic) || ' talebi · ' || private.lead_status_label(new.status);
  else
    body_text := 'Danışmanınız: ' || coalesce(advisor_name, '-');
  end if;

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (new.user_id, 'lead_update', 'Talebiniz güncellendi', body_text, new.listing_id, new.id);
  return null;
end;
$$;

create trigger leads_notify_update
  after update on public.leads
  for each row execute function private.notify_lead_update();
