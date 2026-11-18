-- Adım 11 ("Gerekli değil" maddeleri):
--  Madde 48: Filo envanteri — müşteri mevcut araçlarını (plaka, model, yıl, km, tarihler) ekler.
--  Madde 49: Araç yenileme hatırlatması — araç belirlenen yaşı ya da kilometreyi geçince bildirim.
--  Madde 50: Bakım ve muayene bildirimleri — muayene, sigorta ve bakım tarihi yaklaşınca (14 gün kala ve günü gelince) bildirim.
create table public.fleet_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plate text not null check (length(trim(plate)) between 2 and 15),
  category_slug text check (category_slug is null or category_slug in ('kamyon', 'cekici', 'dorse', 'ticari-arac')),
  brand text check (brand is null or length(brand) <= 60),
  model text check (model is null or length(model) <= 80),
  year int check (year is null or year between 1950 and 2100),
  km int check (km is null or km >= 0),
  inspection_due date,
  insurance_due date,
  service_due date,
  renewal_age_years int not null default 10 check (renewal_age_years between 1 and 50),
  renewal_km int not null default 1000000 check (renewal_km between 10000 and 10000000),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fleet_vehicles_user_idx on public.fleet_vehicles (user_id, created_at desc);

alter table public.fleet_vehicles enable row level security;

create policy "Müşteri kendi filosunu yönetir" on public.fleet_vehicles
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Admin filoları görür" on public.fleet_vehicles
  for select to authenticated using ((select private.is_admin()));

create trigger fleet_vehicles_set_updated_at
  before update on public.fleet_vehicles
  for each row execute function private.set_updated_at();

-- Aynı hatırlatma iki kez gönderilmesin (araç + tür + tarih + gün farkı).
create table public.fleet_reminders (
  vehicle_id uuid not null references public.fleet_vehicles (id) on delete cascade,
  kind text not null check (kind in ('inspection', 'insurance', 'service', 'renewal')),
  due_key text not null,
  sent_at timestamptz not null default now(),
  primary key (vehicle_id, kind, due_key)
);
alter table public.fleet_reminders enable row level security;
-- Yalnız sunucu görevi yazar/okur (istemciye politika yok).

alter table public.notifications add column fleet_vehicle_id uuid references public.fleet_vehicles (id) on delete cascade;
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in ('new_listing', 'price_change', 'status_change', 'message_reply', 'announcement', 'new_message', 'lead_new', 'lead_update', 'similar_listing', 'fleet_reminder')
);

create or replace function private.send_fleet_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
  v_label text;
  v_due date;
  v_kind text;
  v_days int;
  v_name text;
begin
  for r in select * from public.fleet_vehicles loop
    v_name := r.plate || coalesce(' · ' || nullif(trim(coalesce(r.brand, '') || ' ' || coalesce(r.model, '')), ''), '');
    -- Tarih hatırlatmaları: 14 gün kala ve günü gelince (geçmişse bir kez "süresi geçti").
    foreach v_kind in array array['inspection', 'insurance', 'service'] loop
      v_due := case v_kind when 'inspection' then r.inspection_due when 'insurance' then r.insurance_due else r.service_due end;
      continue when v_due is null;
      v_days := v_due - v_today;
      continue when v_days > 14;
      v_label := case v_kind when 'inspection' then 'Muayene' when 'insurance' then 'Sigorta' else 'Bakım' end;
      if v_days between 1 and 14 then
        insert into public.fleet_reminders (vehicle_id, kind, due_key) values (r.id, v_kind, v_due::text || ':14')
        on conflict do nothing;
        if found then
          insert into public.notifications (user_id, type, title, body, fleet_vehicle_id)
          values (r.user_id, 'fleet_reminder', v_label || ' tarihi yaklaşıyor', v_name || ' · ' || to_char(v_due, 'DD.MM.YYYY') || ' (' || v_days || ' gün)', r.id);
        end if;
      elsif v_days <= 0 then
        insert into public.fleet_reminders (vehicle_id, kind, due_key) values (r.id, v_kind, v_due::text || ':0')
        on conflict do nothing;
        if found then
          insert into public.notifications (user_id, type, title, body, fleet_vehicle_id)
          values (r.user_id, 'fleet_reminder',
                  v_label || case when v_days = 0 then ' günü bugün' else ' tarihi geçti' end,
                  v_name || ' · ' || to_char(v_due, 'DD.MM.YYYY'), r.id);
        end if;
      end if;
    end loop;

    -- Yenileme: yaş ya da kilometre eşiği aşıldıysa bir kez (eşik değişince yeniden).
    if (r.year is not null and extract(year from v_today)::int - r.year >= r.renewal_age_years)
       or (r.km is not null and r.km >= r.renewal_km) then
      insert into public.fleet_reminders (vehicle_id, kind, due_key) values (r.id, 'renewal', r.renewal_age_years || 'y:' || r.renewal_km || 'km')
      on conflict do nothing;
      if found then
        insert into public.notifications (user_id, type, title, body, fleet_vehicle_id)
        values (r.user_id, 'fleet_reminder', 'Aracınızı yenileme zamanı',
                v_name || case when r.km is not null and r.km >= r.renewal_km
                               then ' · ' || replace(to_char(r.km, 'FM999,999,999'), ',', '.') || ' km'
                               else ' · ' || (extract(year from v_today)::int - r.year) || ' yaşında' end
                || ' · Yeni araç ve takas fırsatlarına göz atın', r.id);
      end if;
    end if;
  end loop;
end;
$$;

-- Her gün 09:00 (İstanbul) = 06:00 UTC.
select cron.schedule('fleet-reminders', '0 6 * * *', $$select private.send_fleet_reminders()$$);

-- Push hedefi: filo aracı.
create or replace function private.send_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_target jsonb;
  v_body text;
begin
  select p.expo_push_token into v_token from public.profiles p where p.id = new.user_id;
  if v_token is null then
    return null;
  end if;

  v_target := case
    when new.fleet_vehicle_id is not null then jsonb_build_object('type', 'fleet', 'vehicleId', new.fleet_vehicle_id)
    when new.lead_id is not null then jsonb_build_object('type', 'lead', 'leadId', new.lead_id)
    when new.announcement_id is not null then jsonb_build_object('type', 'announcement', 'announcementId', new.announcement_id)
    when new.type in ('message_reply', 'new_message') and new.conversation_id is not null
      then jsonb_build_object('type', 'conversation', 'conversationId', new.conversation_id)
    when new.listing_id is not null then jsonb_build_object('type', 'listing', 'listingId', new.listing_id)
    when new.conversation_id is not null then jsonb_build_object('type', 'conversation', 'conversationId', new.conversation_id)
    else null
  end;

  v_body := coalesce(nullif(trim(new.body), ''), case new.type
    when 'price_change' then 'Yeni fiyat: ' || replace(to_char((new.data ->> 'new_price')::numeric, 'FM999,999,999,999'), ',', '.') || ' TL'
    when 'status_change' then 'İlan durumu güncellendi'
    else ''
  end);

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'to', v_token,
      'title', new.title,
      'body', v_body,
      'sound', 'default',
      'channelId', 'default',
      'data', jsonb_build_object('notificationId', new.id, 'target', v_target)
    )
  );
  return null;
exception when others then
  return null;
end;
$$;
