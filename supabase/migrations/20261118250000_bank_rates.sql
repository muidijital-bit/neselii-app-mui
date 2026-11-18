-- Madde 20: Çoklu banka teklif karşılaştırma. Firma anlaşmalı bankaların aylık oranlarını girer; hesaplayıcı her banka için taksit ve toplam
-- maliyeti yan yana gösterir. (Madde 21 kurumsal finansman bilgileri talebin data.corporate alanındadır; şema değişikliği gerekmez.)
create table public.bank_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  monthly_rate_percent numeric(5, 2) not null check (monthly_rate_percent >= 0 and monthly_rate_percent <= 20),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.bank_rates enable row level security;

create policy "Banka oranları herkese açık" on public.bank_rates
  for select to anon, authenticated using (true);
create policy "Admin banka oranlarını yönetir" on public.bank_rates
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
