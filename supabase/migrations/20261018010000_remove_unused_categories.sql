-- Firma yalnızca ticari araç satıyor: kullanılmayan kategoriler kaldırılır.
-- İlanı olan kategori silinmez (listings.category_slug yabancı anahtarı engeller).
delete from public.categories
 where slug in ('otomobil', 'is-makinesi', 'gayrimenkul', 'arsa')
   and not exists (select 1 from public.listings l where l.category_slug = categories.slug);
