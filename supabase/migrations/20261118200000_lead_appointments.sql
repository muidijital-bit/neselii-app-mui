-- Madde 31: Randevu yönetimi. Talebe yönetici randevu tarihi/saati atar; müşteriye bildirim gider, 24 saat kala hatırlatma gönderilir.
-- Madde 14/15/39: Görüntülü inceleme, yerinde inceleme ve ekspertiz randevuları aynı talep yapısını kullanır.
create extension if not exists pg_cron;

alter table public.leads drop constraint leads_topic_check;
alter table public.leads add constraint leads_topic_check check (topic in ('info', 'financing', 'video_call', 'inspection', 'expertise'));

alter table public.leads
  add column appointment_at timestamptz,
  add column reminder_sent_at timestamptz;

create index leads_appointment_idx on public.leads (appointment_at) where appointment_at is not null;

grant update (appointment_at) on public.leads to authenticated;

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
    else 'Bilgi'
  end;
$$;

create or replace function private.format_appointment(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI');
$$;

-- Randevu atanınca "Yeni" talep "Görüşülüyor" olur; randevu değişince hatırlatma yeniden gönderilebilir.
create or replace function private.prepare_lead_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.appointment_at is distinct from old.appointment_at then
    new.reminder_sent_at := null;
    if new.appointment_at is not null and new.status = 'new' then
      new.status := 'in_progress';
    end if;
  end if;
  return new;
end;
$$;

create trigger leads_prepare_update
  before update on public.leads
  for each row execute function private.prepare_lead_update();

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
     and new.appointment_at is not distinct from old.appointment_at then
    return null;
  end if;

  if new.appointment_at is distinct from old.appointment_at then
    if new.appointment_at is not null then
      title_text := 'Randevunuz oluşturuldu';
      body_text := private.lead_topic_label(new.topic) || ' · ' || private.format_appointment(new.appointment_at);
    else
      body_text := private.lead_topic_label(new.topic) || ' randevunuz iptal edildi';
    end if;
  elsif new.status is distinct from old.status then
    body_text := private.lead_topic_label(new.topic) || ' talebi · ' || private.lead_status_label(new.status);
  elsif new.advisor_id is null then
    return null;
  else
    select a.full_name into advisor_name from public.advisors a where a.id = new.advisor_id;
    body_text := 'Danışmanınız: ' || advisor_name;
  end if;

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (new.user_id, 'lead_update', title_text, body_text, new.listing_id, new.id);
  return null;
end;
$$;

-- 24 saat içindeki randevular için müşteriye ve yöneticilere tek seferlik hatırlatma.
create or replace function private.send_appointment_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select l.id, l.user_id, l.listing_id, l.topic, l.appointment_at, coalesce(nullif(trim(p.full_name), ''), 'Müşteri') as customer
      from public.leads l
      left join public.profiles p on p.id = l.user_id
     where l.appointment_at between now() and now() + interval '24 hours'
       and l.reminder_sent_at is null
       and l.status in ('new', 'in_progress')
     for update of l skip locked
  loop
    insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
    values (r.user_id, 'lead_update', 'Randevu hatırlatması',
            private.lead_topic_label(r.topic) || ' · ' || private.format_appointment(r.appointment_at), r.listing_id, r.id);

    insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
    select a.id, 'lead_new', 'Yaklaşan randevu: ' || r.customer,
           private.lead_topic_label(r.topic) || ' · ' || private.format_appointment(r.appointment_at), r.listing_id, r.id
      from public.profiles a
     where a.role = 'admin';

    update public.leads set reminder_sent_at = now() where id = r.id;
  end loop;
end;
$$;

select cron.schedule('appointment-reminders', '*/15 * * * *', $$select private.send_appointment_reminders()$$);
