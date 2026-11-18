-- Finansman ayarları (tek satır): aylık ödeme hesaplayıcı ve "bütçeme göre araç bul" bu değerleri kullanır. Yönetici uygulamadan günceller.
create table public.finance_settings (
  id boolean primary key default true check (id),
  monthly_rate_percent numeric(5, 2) not null default 2.99 check (monthly_rate_percent >= 0 and monthly_rate_percent <= 20),
  min_down_payment_percent int not null default 30 check (min_down_payment_percent between 0 and 90),
  terms int[] not null default '{12,24,36}' check (cardinality(terms) between 1 and 7 and terms <@ array[6, 12, 18, 24, 36, 48, 60]),
  updated_at timestamptz not null default now()
);

insert into public.finance_settings (id) values (true);

alter table public.finance_settings enable row level security;

create policy "Finansman ayarları herkese açık" on public.finance_settings
  for select to anon, authenticated using (true);
create policy "Admin finansman ayarlarını günceller" on public.finance_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

revoke insert, update, delete on public.finance_settings from anon, authenticated;
grant update (monthly_rate_percent, min_down_payment_percent, terms) on public.finance_settings to authenticated;

create trigger finance_settings_set_updated_at
  before update on public.finance_settings
  for each row execute function private.set_updated_at();
