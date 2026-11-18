-- Adım 6 ("Sonraki" maddeleri, talep altyapısı üzerine):
--  Madde 26: Sigorta / kasko teklif talebi        → talep konusu 'insurance'
--  Madde 44: Çoklu araç / filo teklifi             → talep konusu 'fleet_quote' (ilanlar data.listingIds)
--  Madde 33: Araç rezervasyonu                    → talep konusu 'reservation'; yönetici onaylar, ilan süreli "Rezerve" olur,
--                                                    süre dolunca otomatik yayına döner. Kapora / online ödeme kapsam dışı (tartışılabilir).
alter table public.leads drop constraint leads_topic_check;
alter table public.leads add constraint leads_topic_check check (
  topic in ('info', 'financing', 'video_call', 'inspection', 'expertise', 'insurance', 'fleet_quote', 'reservation')
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
    else 'Bilgi'
  end;
$$;

alter table public.listings
  add column reserved_until timestamptz,
  add column reserved_lead_id uuid references public.leads (id) on delete set null;

create index listings_reserved_until_idx on public.listings (reserved_until) where reserved_until is not null;

-- Yönetici: rezervasyonu onayla (ilan p_days gün "Rezerve").
create or replace function public.approve_reservation(p_lead_id uuid, p_days int)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.leads%rowtype;
  v_until timestamptz;
  v_title text;
begin
  if not (select private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 30 then
    raise exception 'invalid days' using errcode = '22023';
  end if;
  select * into v_lead from public.leads where id = p_lead_id;
  if not found or v_lead.listing_id is null then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.listings where id = v_lead.listing_id and status not in ('published', 'reserved')) then
    raise exception 'listing not available' using errcode = '22023';
  end if;
  if exists (select 1 from public.listings where id = v_lead.listing_id and status = 'reserved'
              and reserved_lead_id is distinct from p_lead_id) then
    raise exception 'listing already reserved' using errcode = '22023';
  end if;

  v_until := now() + make_interval(days => p_days);
  update public.listings
     set status = 'reserved', reserved_until = v_until, reserved_lead_id = p_lead_id
   where id = v_lead.listing_id
  returning title into v_title;

  update public.leads set status = 'in_progress' where id = p_lead_id and status = 'new';

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (v_lead.user_id, 'lead_update', 'Rezervasyonunuz onaylandı',
          v_title || ' · ' || private.format_appointment(v_until) || ' tarihine kadar sizin için ayrıldı', v_lead.listing_id, p_lead_id);
  return v_until;
end;
$$;

-- Rezervasyonu bitir: ilan yayına döner. p_notify_admins: süre dolduğunda (cron) yöneticilere de haber verilir.
create or replace function private.end_reservation(p_listing_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing record;
  v_user uuid;
begin
  select id, title, reserved_lead_id into v_listing from public.listings where id = p_listing_id and status = 'reserved';
  if not found then
    return;
  end if;
  update public.listings set status = 'published', reserved_until = null, reserved_lead_id = null where id = p_listing_id;
  select user_id into v_user from public.leads where id = v_listing.reserved_lead_id;
  if v_user is not null then
    insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
    values (v_user, 'lead_update', 'Rezervasyon sona erdi', v_listing.title || ' · ' || p_reason, p_listing_id, v_listing.reserved_lead_id);
  end if;
  if p_reason = 'süre doldu' then
    insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
    select a.id, 'lead_new', 'Rezervasyon süresi doldu', v_listing.title || ' yeniden yayında', p_listing_id, v_listing.reserved_lead_id
      from public.profiles a where a.role = 'admin';
  end if;
end;
$$;

create or replace function public.release_reservation(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select id into v_listing from public.listings where reserved_lead_id = p_lead_id;
  if v_listing is null then
    raise exception 'reservation not found' using errcode = 'P0002';
  end if;
  perform private.end_reservation(v_listing, 'rezervasyon kaldırıldı');
end;
$$;

create or replace function private.expire_reservations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in select id from public.listings where status = 'reserved' and reserved_until is not null and reserved_until < now() loop
    perform private.end_reservation(r.id, 'süre doldu');
  end loop;
end;
$$;

revoke execute on function public.approve_reservation(uuid, int) from public, anon;
revoke execute on function public.release_reservation(uuid) from public, anon;
grant execute on function public.approve_reservation(uuid, int) to authenticated;
grant execute on function public.release_reservation(uuid) to authenticated;

select cron.schedule('reservation-expiry', '*/15 * * * *', $$select private.expire_reservations()$$);
