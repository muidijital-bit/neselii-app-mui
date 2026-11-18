-- Adım 12 ("Gerekli değil" maddeleri):
--  Madde 22: Finansman başvuru takibi — finansman talebine durum adımları; müşteri Taleplerim'de görür, adım değişince bildirim.
--  Madde 34: Satış süreci takibi — talebe satış adımları (firma içi takip; yönetici "Satış Süreci" ekranı).
--  Madde 45: Projeye göre araç paketi — yönetici ilanlardan paket oluşturur, müşteri paket için tek teklif ister.
alter table public.leads
  add column finance_stage text check (finance_stage is null or finance_stage in ('received', 'documents', 'bank', 'approved', 'completed', 'declined')),
  add column sales_stage text check (sales_stage is null or sales_stage in ('meeting', 'quote', 'financing', 'notary', 'delivery', 'won', 'lost'));

create index leads_sales_stage_idx on public.leads (sales_stage) where sales_stage is not null;

grant update (finance_stage, sales_stage) on public.leads to authenticated;

create or replace function private.finance_stage_label(p_stage text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_stage
    when 'received' then 'Başvuru alındı'
    when 'documents' then 'Belgeler bekleniyor'
    when 'bank' then 'Bankada değerlendiriliyor'
    when 'approved' then 'Onaylandı'
    when 'completed' then 'Sonuçlandı'
    when 'declined' then 'Olumsuz sonuçlandı'
    else p_stage
  end;
$$;

create or replace function private.notify_finance_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.finance_stage is not distinct from old.finance_stage or new.finance_stage is null then
    return null;
  end if;
  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (new.user_id, 'lead_update', 'Finansman başvurunuz güncellendi', private.finance_stage_label(new.finance_stage), new.listing_id, new.id);
  return null;
end;
$$;

create trigger leads_notify_finance_stage
  after update of finance_stage on public.leads
  for each row execute function private.notify_finance_stage();

-- Paketler
create table public.vehicle_packages (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 100),
  description text check (description is null or length(description) <= 1000),
  sector text check (sector is null or sector in ('construction', 'logistics', 'city_delivery', 'cold_chain', 'tanker', 'agriculture')),
  published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_package_items (
  package_id uuid not null references public.vehicle_packages (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  sort_order int not null default 0,
  primary key (package_id, listing_id)
);

alter table public.vehicle_packages enable row level security;
alter table public.vehicle_package_items enable row level security;

create policy "Yayımlanan paketler herkese açık, admin hepsini görür" on public.vehicle_packages
  for select to anon, authenticated using (published or (select private.is_admin()));
create policy "Admin paket yönetir" on public.vehicle_packages
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Paket araçları paketle birlikte açık" on public.vehicle_package_items
  for select to anon, authenticated using (exists (select 1 from public.vehicle_packages p where p.id = package_id and (p.published or (select private.is_admin()))));
create policy "Admin paket araçlarını yönetir" on public.vehicle_package_items
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create trigger vehicle_packages_set_updated_at
  before update on public.vehicle_packages
  for each row execute function private.set_updated_at();
