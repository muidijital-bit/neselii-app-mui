-- Madde 27: Sabit telefon araması kaydı. Müşteri "Hemen Ara"ya her dokunduğunda ilan bazında kayıt düşer; yönetici sayıları ve listeyi görür.
create table public.call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Genel arama (ana sayfa "Hemen Ara") için null.
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now()
);

create index call_logs_listing_idx on public.call_logs (listing_id, created_at desc);
create index call_logs_created_idx on public.call_logs (created_at desc);
create index call_logs_user_idx on public.call_logs (user_id);

alter table public.call_logs enable row level security;

create policy "Kullanıcı kendi aramasını kaydeder" on public.call_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Admin aramaları görür" on public.call_logs
  for select to authenticated using ((select private.is_admin()));

revoke update, delete on public.call_logs from anon, authenticated;
