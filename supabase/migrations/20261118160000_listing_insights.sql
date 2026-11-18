-- Madde 11 (Bakım ve kullanım geçmişi), 12 (Neşeli güven puanı), 13 (Uzman görüşü).
-- İlan başına tek satır; yönetici ilan detayından girer, müşteri ilan detayında görür. Güven puanı kontrol maddelerinden uygulamada hesaplanır.
create table public.listing_insights (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  -- Madde 11: kullanım ve bakım geçmişi
  usage_type text check (usage_type is null or length(usage_type) <= 60),
  owner_count int check (owner_count is null or owner_count between 0 and 50),
  last_service_date date,
  last_service_km int check (last_service_km is null or last_service_km >= 0),
  history_note text check (history_note is null or length(history_note) <= 1000),
  -- Madde 12: güven kontrol maddeleri
  check_expertise boolean not null default false,
  check_maintenance boolean not null default false,
  check_no_heavy_damage boolean not null default false,
  check_inspection boolean not null default false,
  check_documents boolean not null default false,
  check_service_records boolean not null default false,
  -- Madde 13: uzman görüşü (danışman adıyla)
  expert_advisor_id uuid references public.advisors (id) on delete set null,
  strengths text[] not null default '{}' check (cardinality(strengths) <= 10),
  cautions text[] not null default '{}' check (cardinality(cautions) <= 10),
  updated_at timestamptz not null default now()
);

create index listing_insights_expert_idx on public.listing_insights (expert_advisor_id);

alter table public.listing_insights enable row level security;

-- Görünür ilanın bilgileri herkese açık (ilan RLS'i taslak/kalkmış ilanı zaten gizler).
create policy "Görünür ilanın bilgileri açık" on public.listing_insights
  for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_insights.listing_id));
create policy "Admin ilan bilgilerini yönetir" on public.listing_insights
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create trigger listing_insights_set_updated_at
  before update on public.listing_insights
  for each row execute function private.set_updated_at();
