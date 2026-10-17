-- Neşeli Otomotiv: başlangıç şeması
-- İlanlar admin tarafından girilir; kullanıcılar listeler, favoriler ve satıcıyla mesajlaşır.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Profiller
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Yeni kullanıcı kaydında profil oluştur
create or replace function public.handle_new_user()
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
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- İlanlar
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'TRY',
  brand text not null,
  model text not null,
  series text,
  year int not null check (year between 1950 and 2100),
  km int not null default 0 check (km >= 0),
  fuel_type text check (fuel_type in ('benzin', 'dizel', 'lpg', 'hibrit', 'elektrik')),
  transmission text check (transmission in ('manuel', 'otomatik', 'yari_otomatik')),
  body_type text,
  color text,
  condition text not null default 'ikinci_el' check (condition in ('sifir', 'ikinci_el')),
  city text,
  district text,
  status text not null default 'active' check (status in ('active', 'sold', 'passive')),
  is_featured boolean not null default false,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_brand_model_idx on public.listings (brand, model);
create index listings_price_idx on public.listings (price);
create index listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index listing_images_listing_idx on public.listing_images (listing_id, sort_order);

-- ---------------------------------------------------------------------------
-- Favoriler
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------------------------------------------------------------------------
-- Mesajlaşma
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  last_message text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message = new.body,
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- profiles
create policy "Profiller herkese açık okunur" on public.profiles
  for select using (true);
create policy "Kullanıcı kendi profilini günceller" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Rol kullanıcı tarafından değiştirilemez
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- listings
create policy "Aktif/satılmış ilanlar herkese açık" on public.listings
  for select using (status in ('active', 'sold') or public.is_admin());
create policy "Admin ilan ekler" on public.listings
  for insert with check (public.is_admin());
create policy "Admin ilan günceller" on public.listings
  for update using (public.is_admin());
create policy "Admin ilan siler" on public.listings
  for delete using (public.is_admin());

-- listing_images
create policy "İlan görselleri herkese açık" on public.listing_images
  for select using (true);
create policy "Admin görsel yönetir" on public.listing_images
  for all using (public.is_admin()) with check (public.is_admin());

-- favorites
create policy "Kullanıcı kendi favorilerini görür" on public.favorites
  for select using (auth.uid() = user_id);
create policy "Kullanıcı favori ekler" on public.favorites
  for insert with check (auth.uid() = user_id);
create policy "Kullanıcı favori siler" on public.favorites
  for delete using (auth.uid() = user_id);

-- conversations
create policy "Taraflar konuşmayı görür" on public.conversations
  for select using (auth.uid() in (buyer_id, seller_id));
create policy "Alıcı konuşma başlatır" on public.conversations
  for insert with check (
    auth.uid() = buyer_id
    and seller_id = (select l.seller_id from public.listings l where l.id = listing_id)
  );

-- messages
create policy "Taraflar mesajları görür" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
       where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );
create policy "Taraflar mesaj gönderir" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );
create policy "Alıcı taraf okundu işaretler" on public.messages
  for update using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

-- Mesajlarda sadece okundu bilgisi güncellenebilir
revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ---------------------------------------------------------------------------
-- Storage: ilan görselleri
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "İlan görselleri public okunur" on storage.objects
  for select using (bucket_id = 'listing-images');
create policy "Admin ilan görseli yükler" on storage.objects
  for insert with check (bucket_id = 'listing-images' and public.is_admin());
create policy "Admin ilan görseli günceller" on storage.objects
  for update using (bucket_id = 'listing-images' and public.is_admin());
create policy "Admin ilan görseli siler" on storage.objects
  for delete using (bucket_id = 'listing-images' and public.is_admin());
