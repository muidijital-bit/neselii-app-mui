-- Adım 10b:
--  Madde 46: Sektörel içerik merkezi — yönetici sektöre göre rehber yazıları yayımlar, müşteri sektörüne göre okur.
--  Madde 7:  Video araç inceleme — videolara bölüm etiketi (soğuk çalıştırma, kabin, motor, alt takım, kasa); ilanda bölüm sekmeleri.
create table public.guides (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 140),
  body text not null check (length(trim(body)) between 1 and 20000),
  -- Uygulamadaki sektör kimliği (construction, logistics…); null = tüm sektörler (genel).
  sector text check (sector is null or sector in ('construction', 'logistics', 'city_delivery', 'cold_chain', 'tanker', 'agriculture')),
  published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guides_published_idx on public.guides (published, sector, created_at desc);

alter table public.guides enable row level security;

create policy "Yayımlanan rehberler herkese açık, admin hepsini görür" on public.guides
  for select to anon, authenticated using (published or (select private.is_admin()));
create policy "Admin rehber yönetir" on public.guides
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create trigger guides_set_updated_at
  before update on public.guides
  for each row execute function private.set_updated_at();

alter table public.listing_media
  add column section text check (section is null or section in ('cold_start', 'cabin', 'engine', 'undercarriage', 'body'));
