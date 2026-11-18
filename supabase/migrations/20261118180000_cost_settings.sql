-- Madde 24: Toplam sahip olma maliyeti. Firmanın varsayılan maliyet değerleri finansman ayarları satırında tutulur (yönetici günceller).
alter table public.finance_settings
  add column fuel_price_tl numeric(8, 2) not null default 55 check (fuel_price_tl >= 0 and fuel_price_tl <= 1000),
  add column fuel_consumption jsonb not null default '{"kamyon": 28, "cekici": 32, "ticari-arac": 11, "dorse": 0}'::jsonb,
  add column maintenance_tl_per_km numeric(8, 2) not null default 2.5 check (maintenance_tl_per_km >= 0 and maintenance_tl_per_km <= 1000),
  add column tire_tl_per_km numeric(8, 2) not null default 1.2 check (tire_tl_per_km >= 0 and tire_tl_per_km <= 1000),
  add column insurance_tl_per_year numeric(12, 2) not null default 75000 check (insurance_tl_per_year >= 0),
  add column tax_tl_per_year numeric(12, 2) not null default 25000 check (tax_tl_per_year >= 0);

grant update (fuel_price_tl, fuel_consumption, maintenance_tl_per_km, tire_tl_per_km, insurance_tl_per_year, tax_tl_per_year)
  on public.finance_settings to authenticated;
