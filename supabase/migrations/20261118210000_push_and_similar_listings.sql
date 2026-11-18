-- Madde 6: Fiyat ve stok bildirimleri telefona da gider (push) + "benzer araç" bildirimi.
-- Uygulama içi her bildirim (notifications satırı) yazıldığında alıcının Expo push belirteci varsa Expo Push API'ye gönderilir (pg_net, asenkron).
create extension if not exists pg_net with schema extensions;

-- Cihaz belirteci: bir cihaz yalnız oturum açık hesabın bildirimlerini alır (aynı belirteç başka hesaptan silinir).
create or replace function public.register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'invalid push token' using errcode = '22023';
  end if;
  update public.profiles set expo_push_token = null where expo_push_token = p_token and id <> v_uid;
  update public.profiles set expo_push_token = p_token where id = v_uid;
end;
$$;

create or replace function public.unregister_push_token()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set expo_push_token = null where id = (select auth.uid());
$$;

revoke execute on function public.register_push_token(text) from public, anon;
revoke execute on function public.unregister_push_token() from public, anon;
grant execute on function public.register_push_token(text) to authenticated;
grant execute on function public.unregister_push_token() to authenticated;

-- Yeni bildirim türü: benzer araç.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in ('new_listing', 'price_change', 'status_change', 'message_reply', 'announcement', 'new_message', 'lead_new', 'lead_update', 'similar_listing')
);

-- Push gönderimi: hedef (dokununca açılacak ekran) uygulamanın bildirim hedefiyle aynı kuralla üretilir.
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
  -- Push hatası bildirimi (uygulama içi kaydı) asla engellemez.
  return null;
end;
$$;

create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function private.send_push();

-- "Benzer araç": yayına giren ilan, kullanıcının favorisindeki bir ilanla aynı kategori + alt türde ve fiyatı ±%15 içindeyse.
-- Kullanıcı başına günde en çok bir benzer araç bildirimi; aynı ilan için zaten "yeni ilan" bildirimi alan kullanıcıya gönderilmez.
create or replace function private.notify_similar_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (new.status = 'published' and (tg_op = 'INSERT' or old.status in ('draft', 'unpublished'))) then
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, listing_id)
  select distinct f.user_id, 'similar_listing', 'Beğendiğiniz araca benzer yeni ilan', new.title, new.id
    from public.favorites f
    join public.listings l on l.id = f.listing_id
    join public.profiles p on p.id = f.user_id
   where p.notify_new_listings
     and l.id <> new.id
     and l.category_slug = new.category_slug
     and coalesce(l.subtype, '') = coalesce(new.subtype, '')
     and new.price between l.price * 0.85 and l.price * 1.15
     and not exists (
       select 1 from public.notifications n
        where n.user_id = f.user_id
          and (n.listing_id = new.id or (n.type = 'similar_listing' and n.created_at > now() - interval '1 day'))
     );
  return null;
end;
$$;

-- Ad sırası: "listings_notify_changes" (yeni ilan) önce, "listings_notify_similar" sonra çalışır.
create trigger listings_notify_similar
  after insert or update of status on public.listings
  for each row execute function private.notify_similar_listing();
