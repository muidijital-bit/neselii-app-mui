-- Adım 8: Belgeler.
--  Madde 9:  Araç sağlık kartı (ekspertiz özeti, mekanik durum, lastik, muayene, bilinen kusurlar) → listing_insights alanları
--  Madde 10: Ekspertiz raporu PDF'i ilana yüklenir → herkese açık 'listing-documents' depolama alanı
--  Madde 52: Müşterinin belge arşivi (teklif, ekspertiz, teslimat…) → customer_documents + özel 'customer-documents' alanı
--  Madde 32: Teklif oluşturma: yönetici uygulamada PDF üretir ve müşterinin belge arşivine gönderir (kind = 'quote')
alter table public.listing_insights
  add column expertise_summary text check (expertise_summary is null or length(expertise_summary) <= 500),
  add column mechanical_condition text check (mechanical_condition is null or length(mechanical_condition) <= 300),
  add column tire_percent int check (tire_percent is null or tire_percent between 0 and 100),
  add column inspection_valid_until date,
  add column known_defects text[] not null default '{}' check (cardinality(known_defects) <= 10),
  add column expertise_report_path text;

-- İlan belgeleri (ekspertiz raporu): herkese açık okuma, yalnız yönetici yazar/siler.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-documents', 'listing-documents', true, 20971520, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "İlan belgeleri: admin yükler" on storage.objects
  for insert to authenticated with check (bucket_id = 'listing-documents' and (select private.is_admin()));
create policy "İlan belgeleri: admin günceller" on storage.objects
  for update to authenticated using (bucket_id = 'listing-documents' and (select private.is_admin()));
create policy "İlan belgeleri: admin siler" on storage.objects
  for delete to authenticated using (bucket_id = 'listing-documents' and (select private.is_admin()));

-- Müşteri belge arşivi.
create table public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  kind text not null check (kind in ('quote', 'expertise', 'delivery', 'contract', 'other')),
  title text not null check (length(trim(title)) between 1 and 120),
  storage_path text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index customer_documents_user_idx on public.customer_documents (user_id, created_at desc);
create index customer_documents_lead_idx on public.customer_documents (lead_id);

alter table public.customer_documents enable row level security;

create policy "Müşteri kendi belgelerini, admin hepsini görür" on public.customer_documents
  for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "Admin belge ekler" on public.customer_documents
  for insert to authenticated with check ((select private.is_admin()) and created_by = (select auth.uid()));
create policy "Admin belge siler" on public.customer_documents
  for delete to authenticated using ((select private.is_admin()));

revoke update on public.customer_documents from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-documents', 'customer-documents', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Müşteri belgeleri: admin yükler" on storage.objects
  for insert to authenticated with check (bucket_id = 'customer-documents' and (select private.is_admin()));
create policy "Müşteri belgeleri: sahibi ve admin okur" on storage.objects
  for select to authenticated using (
    bucket_id = 'customer-documents' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
  );
create policy "Müşteri belgeleri: admin siler" on storage.objects
  for delete to authenticated using (bucket_id = 'customer-documents' and (select private.is_admin()));

-- Yeni belge → müşteriye bildirim (talebe bağlıysa talep açılır).
create or replace function private.notify_customer_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, lead_id, listing_id)
  select new.user_id, 'lead_update',
         case new.kind when 'quote' then 'Teklifiniz hazır' else 'Yeni belge eklendi' end,
         new.title || ' · Profil → Belgelerim',
         new.lead_id, l.listing_id
    from (select 1) x
    left join public.leads l on l.id = new.lead_id;
  return null;
end;
$$;

create trigger customer_documents_notify
  after insert on public.customer_documents
  for each row execute function private.notify_customer_document();
