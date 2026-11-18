-- Danışman yönetimi (yönetici ekler / düzenler / siler).
-- Silinen danışmanın açık talepleri (Yeni, Görüşülüyor) rastgele başka bir aktif danışmana aktarılır; müşteri "Danışmanınız: …" bildirimi alır.
-- Kapanmış taleplerde danışman boşalır (FK `on delete set null`); bu boşalma müşteriye bildirim üretmez.

create or replace function private.reassign_advisor_leads()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.leads l
     set advisor_id = (
       select a.id from public.advisors a
        where a.active and a.id <> old.id
        order by random() limit 1
     )
   where l.advisor_id = old.id
     and l.status in ('new', 'in_progress');
  return old;
end;
$$;

create trigger advisors_reassign_leads
  before delete on public.advisors
  for each row execute function private.reassign_advisor_leads();

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
  -- Yalnız danışman boşaldıysa (silinen danışman, kapalı talep) müşteriye bildirim gitmez.
  if new.status is not distinct from old.status and new.advisor_id is null then
    return null;
  end if;

  select a.full_name into advisor_name from public.advisors a where a.id = new.advisor_id;

  if new.status is distinct from old.status then
    body_text := private.lead_topic_label(new.topic) || ' talebi · ' || private.lead_status_label(new.status);
  else
    body_text := 'Danışmanınız: ' || advisor_name;
  end if;

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (new.user_id, 'lead_update', 'Talebiniz güncellendi', body_text, new.listing_id, new.id);
  return null;
end;
$$;
