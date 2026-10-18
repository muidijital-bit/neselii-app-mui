-- Ana sayfadaki "Öne Çıkan İlanlar" için işaret.
alter table public.listings add column if not exists is_featured boolean not null default false;

create index if not exists listings_featured_idx
  on public.listings (published_at desc)
  where is_featured;

-- İlk seçim: fotoğraflı, yayında ve en yüksek fiyatlı 6 ilan. Firma panelinden değiştirilebilir.
update public.listings
   set is_featured = true
 where id in (
   select id from public.listings
    where cover_url is not null and status = 'published'
    order by price desc
    limit 6
 );
