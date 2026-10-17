-- Neşeli Kamyon Tır Pazarı: başlangıç şeması
-- Tek firma (Neşeli Otomotiv) ilan yayımlar. İlanları ve duyuruları yalnızca `admin`
-- rolündeki hesaplar yönetir; kullanıcılar ilanları gezer, favoriler, arama kaydeder
-- ve firmayla ilan bazlı mesajlaşır.
--
-- Not: 30 Mayıs 2026 sonrası açılan projelerde public tablolar Data API'ye otomatik
-- açılmaz; her tablo için GRANT'ler aşağıda açıkça verilir ve hepsinde RLS açıktır.

create extension if not exists pg_trgm with schema extensions;

-- Yardımcı fonksiyonlar Data API'ye açık olmayan `private` şemasında durur.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiller
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  -- Bildirim tercihleri (Bildirim Tercihleri ekranı)
  notify_new_listings boolean not null default true,
  notify_price_changes boolean not null default true,
  notify_status_changes boolean not null default true,
  notify_message_replies boolean not null default true,
  notify_announcements boolean not null default false,
  prefer_nearby boolean not null default false,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Yetki kararı profiles.role üzerinden verilir (kullanıcının değiştirebildiği
-- user_metadata kullanılmaz).
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Yeni kullanıcı kaydında profil oluştur
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Kategoriler (referans veri)
-- ---------------------------------------------------------------------------
create table public.categories (
  slug text primary key,
  name text not null,
  icon text not null,
  subtypes text[] not null default '{}',
  -- Filtre ekranındaki "<Kategori> için özel alanlar":
  -- [{ "key": "km", "label": "Kilometre", "type": "range", "unit": "km" }, ...]
  -- key, listings sütunu (km) ya da listings.attributes içindeki bir anahtardır.
  filter_fields jsonb not null default '[]',
  sort_order int not null default 0
);

insert into public.categories (slug, name, icon, subtypes, filter_fields, sort_order) values
  ('kamyon', 'Kamyon', 'truck', '{Damperli,Kasalı,Frigorifik,Tanker}',
    '[{"key":"km","label":"Kilometre","type":"range","unit":"km"},{"key":"axle_count","label":"Aks Sayısı","type":"select","options":["2","3","4"]}]', 1),
  ('cekici', 'Çekici', 'route', '{4×2,6×2,6×4}',
    '[{"key":"km","label":"Kilometre","type":"range","unit":"km"},{"key":"cab_type","label":"Kabin","type":"select","options":["Normal","Yüksek"]}]', 2),
  ('dorse', 'Dorse', 'box', '{Damper,Tenteli,Lowbed,Silobas}',
    '[{"key":"axle_count","label":"Aks Sayısı","type":"select","options":["2","3","4"]}]', 3),
  ('otomobil', 'Otomobil', 'car', '{Sedan,Hatchback,SUV}',
    '[{"key":"km","label":"Kilometre","type":"range","unit":"km"},{"key":"fuel_type","label":"Yakıt","type":"select","options":["Benzin","Dizel","LPG","Hibrit","Elektrik"]},{"key":"transmission","label":"Vites","type":"select","options":["Manuel","Otomatik","Yarı Otomatik"]}]', 4),
  ('ticari-arac', 'Ticari Araç', 'bus', '{Panelvan,Minibüs,Kamyonet}',
    '[{"key":"km","label":"Kilometre","type":"range","unit":"km"}]', 5),
  ('is-makinesi', 'İş Makinesi', 'forklift', '{Yükleyici,Ekskavatör,Forklift}',
    '[{"key":"work_hours","label":"Çalışma Saati","type":"range","unit":"saat"}]', 6),
  ('gayrimenkul', 'Gayrimenkul', 'building', '{Konut,İş Yeri,Depo}',
    '[{"key":"area_m2","label":"Alan","type":"range","unit":"m²"}]', 7),
  ('arsa', 'Arsa', 'land', '{Sanayi,Ticari,Tarla}',
    '[{"key":"area_m2","label":"Alan","type":"range","unit":"m²"}]', 8);

-- ---------------------------------------------------------------------------
-- İlanlar
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  listing_no bigint generated always as identity (start with 1024500) unique,
  category_slug text not null references public.categories (slug),
  subtype text,
  title text not null check (length(trim(title)) > 0),
  description text,
  price numeric(14, 2) not null check (price >= 0),
  currency text not null default 'TRY',
  -- Ortak filtre alanları (gayrimenkul/arsa için boş kalabilir)
  brand text,
  model text,
  year int check (year between 1950 and 2100),
  km int check (km >= 0),
  -- Kategoriye özel alanlar: axle_count, fuel_type, transmission, area_m2, work_hours...
  attributes jsonb not null default '{}',
  city text not null,
  district text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'reserved', 'sold', 'unpublished')),
  -- listing_media tetikleyicisiyle güncel tutulur (liste kartları için)
  cover_url text,
  photo_count int not null default 0,
  has_video boolean not null default false,
  search_text text generated always as (
    title || ' ' || coalesce(brand, '') || ' ' || coalesce(model, '')
  ) stored,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_status_published_idx on public.listings (status, published_at desc);
create index listings_category_idx on public.listings (category_slug, status, published_at desc);
create index listings_price_idx on public.listings (price);
create index listings_brand_idx on public.listings (brand);
create index listings_created_by_idx on public.listings (created_by);
create index listings_search_trgm_idx on public.listings using gin (search_text extensions.gin_trgm_ops);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function private.set_updated_at();

-- Yayına alınınca yayın tarihini işaretle
create or replace function private.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger listings_set_published_at
  before insert or update of status on public.listings
  for each row execute function private.set_published_at();

-- Fotoğraf ve videolar
create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  type text not null default 'image' check (type in ('image', 'video')),
  url text not null,
  storage_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index listing_media_listing_idx on public.listing_media (listing_id, sort_order);

create or replace function private.refresh_listing_media_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.listing_id, old.listing_id);
begin
  update public.listings l
     set cover_url = (
           select m.url from public.listing_media m
            where m.listing_id = target and m.type = 'image'
            order by m.sort_order, m.created_at limit 1
         ),
         photo_count = (
           select count(*) from public.listing_media m
            where m.listing_id = target and m.type = 'image'
         ),
         has_video = exists (
           select 1 from public.listing_media m
            where m.listing_id = target and m.type = 'video'
         )
   where l.id = target;
  return null;
end;
$$;

create trigger listing_media_summary
  after insert or update or delete on public.listing_media
  for each row execute function private.refresh_listing_media_summary();

-- Kategori sayaçları (Kategoriler ekranı ve ana sayfa çipleri)
create view public.category_stats
with (security_invoker = true) as
select
  c.slug,
  c.name,
  c.icon,
  c.subtypes,
  c.filter_fields,
  c.sort_order,
  count(l.id) filter (where l.status in ('published', 'reserved'))::int as listing_count
from public.categories c
left join public.listings l on l.category_slug = c.slug
group by c.slug;

-- ---------------------------------------------------------------------------
-- Favoriler
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index favorites_listing_idx on public.favorites (listing_id);

-- ---------------------------------------------------------------------------
-- Kayıtlı aramalar
-- ---------------------------------------------------------------------------
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  query text,
  -- { "category": "cekici", "brand": "Mercedes-Benz", "minYear": 2015, "maxYear": 2022,
  --   "minPrice": 0, "maxPrice": 3000000 }
  filters jsonb not null default '{}',
  sort text not null default 'newest',
  notify boolean not null default true,
  created_at timestamptz not null default now()
);

create index saved_searches_user_idx on public.saved_searches (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Mesajlaşma: kullanıcı <-> firma, her konuşma bir ilana bağlı
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_message text,
  last_message_is_staff boolean,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create index conversations_user_idx on public.conversations (user_id, last_message_at desc);
create index conversations_last_message_idx on public.conversations (last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  -- Firma (admin) tarafından mı gönderildi; tetikleyici belirler
  is_staff boolean not null default false,
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;

create or replace function private.set_message_is_staff()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_staff = (select private.is_admin());
  return new;
end;
$$;

create trigger messages_set_is_staff
  before insert on public.messages
  for each row execute function private.set_message_is_staff();

create or replace function private.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message = new.body,
         last_message_is_staff = new.is_staff,
         last_message_at = new.created_at
   where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function private.bump_conversation();

-- Okunmamış mesaj sayısı: kullanıcı için firmadan gelenler, admin için kullanıcıdan gelenler
create view public.conversation_unread
with (security_invoker = true) as
select m.conversation_id, count(*)::int as unread_count
from public.messages m
where m.read_at is null
  and m.is_staff = not (select private.is_admin())
group by m.conversation_id;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and read_at is null
     and is_staff = not (select private.is_admin());
$$;

-- ---------------------------------------------------------------------------
-- Duyurular
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index announcements_published_idx on public.announcements (published_at desc);
create index announcements_created_by_idx on public.announcements (created_by);

-- ---------------------------------------------------------------------------
-- Bildirimler (uygulama içi; tetikleyicilerle oluşturulur)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in ('new_listing', 'price_change', 'status_change', 'message_reply', 'announcement')),
  title text not null,
  body text,
  listing_id uuid references public.listings (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  announcement_id uuid references public.announcements (id) on delete cascade,
  -- Ör. { "old_price": 1050000, "new_price": 985000 } veya { "old_status": "published", "new_status": "sold" }
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_listing_idx on public.notifications (listing_id);
create index notifications_conversation_idx on public.notifications (conversation_id);
create index notifications_announcement_idx on public.notifications (announcement_id);

-- Fiyat / durum değişikliği -> ilanı favorileyenlere
-- Yayına alınma -> eşleşen kayıtlı araması olanlara
create or replace function private.notify_listing_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.price is distinct from old.price and new.status <> 'draft' then
    insert into public.notifications (user_id, type, title, body, listing_id, data)
    select f.user_id, 'price_change', 'Fiyat güncellendi: ' || new.title, null, new.id,
           jsonb_build_object('old_price', old.price, 'new_price', new.price)
      from public.favorites f
      join public.profiles p on p.id = f.user_id
     where f.listing_id = new.id and p.notify_price_changes;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and old.status <> 'draft' and new.status <> 'draft' then
    insert into public.notifications (user_id, type, title, body, listing_id, data)
    select f.user_id, 'status_change',
           case when new.status = 'unpublished' then 'İlan yayından kaldırıldı: '
                else 'İlan durumu değişti: ' end || new.title,
           null, new.id,
           jsonb_build_object('old_status', old.status, 'new_status', new.status)
      from public.favorites f
      join public.profiles p on p.id = f.user_id
     where f.listing_id = new.id and p.notify_status_changes;
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status in ('draft', 'unpublished')) then
    insert into public.notifications (user_id, type, title, body, listing_id)
    select distinct s.user_id, 'new_listing', 'Yeni ilan: ' || new.title,
           (select c.name from public.categories c where c.slug = new.category_slug) || ' kategorisi',
           new.id
      from public.saved_searches s
      join public.profiles p on p.id = s.user_id
     where s.notify
       and p.notify_new_listings
       and (s.query is null or s.query = '' or new.search_text ilike '%' || s.query || '%'
            or new.listing_no::text = s.query)
       and (s.filters ->> 'category' is null or s.filters ->> 'category' = new.category_slug)
       and (s.filters ->> 'brand' is null or s.filters ->> 'brand' = new.brand)
       and (s.filters ->> 'minPrice' is null or new.price >= (s.filters ->> 'minPrice')::numeric)
       and (s.filters ->> 'maxPrice' is null or new.price <= (s.filters ->> 'maxPrice')::numeric)
       and (s.filters ->> 'minYear' is null or new.year >= (s.filters ->> 'minYear')::int)
       and (s.filters ->> 'maxYear' is null or new.year <= (s.filters ->> 'maxYear')::int);
  end if;

  return null;
end;
$$;

create trigger listings_notify_changes
  after insert or update of price, status on public.listings
  for each row execute function private.notify_listing_changes();

-- Firma mesajı -> konuşmanın sahibine
create or replace function private.notify_message_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_staff then
    insert into public.notifications (user_id, type, title, body, listing_id, conversation_id)
    select c.user_id, 'message_reply', 'Mesajınıza cevap verildi',
           l.title || ' ilanı', c.listing_id, c.id
      from public.conversations c
      join public.listings l on l.id = c.listing_id
      join public.profiles p on p.id = c.user_id
     where c.id = new.conversation_id and p.notify_message_replies;
  end if;
  return null;
end;
$$;

create trigger messages_notify_reply
  after insert on public.messages
  for each row execute function private.notify_message_reply();

-- Yayımlanan duyuru -> duyuru bildirimini açmış herkese
create or replace function private.notify_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_at is not null
     and (tg_op = 'INSERT' or old.published_at is null) then
    insert into public.notifications (user_id, type, title, body, announcement_id)
    select p.id, 'announcement', 'Duyuru: ' || new.title, 'Genel duyuru', new.id
      from public.profiles p
     where p.notify_announcements;
  end if;
  return null;
end;
$$;

create trigger announcements_notify
  after insert or update of published_at on public.announcements
  for each row execute function private.notify_announcement();

-- ---------------------------------------------------------------------------
-- Hesap silme (Hesabımı Sil ekranı)
-- ---------------------------------------------------------------------------
-- auth.users'tan silmek için yetki gerekir; fonksiyon yalnızca çağıranın kendi
-- hesabını siler ve yalnızca giriş yapmış kullanıcılara açıktır.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Giriş yapılmamış';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fonksiyon yetkileri
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

-- profiles: herkes yalnızca kendi profilini görür (admin hepsini)
create policy "Kullanıcı kendi profilini görür" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));
create policy "Kullanıcı kendi profilini günceller" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- categories
create policy "Kategoriler herkese açık" on public.categories
  for select to anon, authenticated using (true);
create policy "Admin kategori yönetir" on public.categories
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- listings
create policy "Yayındaki ilanlar herkese açık" on public.listings
  for select to anon, authenticated
  using (status in ('published', 'reserved', 'sold') or (select private.is_admin()));
create policy "Admin ilan ekler" on public.listings
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admin ilan günceller" on public.listings
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admin ilan siler" on public.listings
  for delete to authenticated using ((select private.is_admin()));

-- listing_media
create policy "İlan medyası görünür ilanlarla açık" on public.listing_media
  for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "Admin medya yönetir" on public.listing_media
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- favorites
create policy "Kullanıcı kendi favorilerini görür" on public.favorites
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Kullanıcı favori ekler" on public.favorites
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Kullanıcı favori siler" on public.favorites
  for delete to authenticated using ((select auth.uid()) = user_id);

-- saved_searches
create policy "Kullanıcı kendi aramalarını yönetir" on public.saved_searches
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- conversations
create policy "Sahibi ve firma konuşmayı görür" on public.conversations
  for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "Kullanıcı konuşma başlatır" on public.conversations
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.listings l
       where l.id = listing_id and l.status in ('published', 'reserved')
    )
  );

-- messages
create policy "Taraflar mesajları görür" on public.messages
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.conversations c
       where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy "Taraflar mesaj gönderir" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      (select private.is_admin())
      or exists (
        select 1 from public.conversations c
         where c.id = conversation_id and c.user_id = (select auth.uid())
      )
    )
  );
create policy "Alıcı taraf okundu işaretler" on public.messages
  for update to authenticated
  using (
    is_staff = not (select private.is_admin())
    and (
      (select private.is_admin())
      or exists (
        select 1 from public.conversations c
         where c.id = conversation_id and c.user_id = (select auth.uid())
      )
    )
  )
  with check (
    is_staff = not (select private.is_admin())
  );

-- announcements
create policy "Yayımlanan duyurular herkese açık" on public.announcements
  for select to anon, authenticated
  using (published_at is not null or (select private.is_admin()));
create policy "Admin duyuru yönetir" on public.announcements
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- notifications
create policy "Kullanıcı kendi bildirimlerini görür" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Kullanıcı bildirimini okundu yapar" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Kullanıcı bildirimini siler" on public.notifications
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Data API yetkileri (yeni projelerde otomatik verilmez)
-- ---------------------------------------------------------------------------
grant select on public.categories, public.category_stats, public.listings,
  public.listing_media, public.announcements to anon, authenticated;

grant select, insert, update, delete on public.categories, public.listings,
  public.listing_media, public.announcements to authenticated;

grant select on public.profiles to authenticated;
-- Rol ve sistem alanları kullanıcı tarafından değiştirilemez
grant update (full_name, phone, avatar_url, notify_new_listings, notify_price_changes,
  notify_status_changes, notify_message_replies, notify_announcements, prefer_nearby,
  expo_push_token) on public.profiles to authenticated;

grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;

grant select on public.conversations, public.conversation_unread to authenticated;
grant insert (listing_id, user_id) on public.conversations to authenticated;

grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Storage: ilan fotoğraf ve videoları
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media', 'listing-media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

-- Upsert (dosya değiştirme) için insert + select + update birlikte gerekir
create policy "İlan medyası public okunur" on storage.objects
  for select to anon, authenticated using (bucket_id = 'listing-media');
create policy "Admin ilan medyası yükler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-media' and (select private.is_admin()));
create policy "Admin ilan medyası günceller" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-media' and (select private.is_admin()));
create policy "Admin ilan medyası siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-media' and (select private.is_admin()));
