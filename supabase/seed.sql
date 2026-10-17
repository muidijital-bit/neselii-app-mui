-- Örnek veri. Önce Supabase Auth'ta bir kullanıcı oluşturun, ardından o kullanıcıyı admin yapın:
--   update public.profiles set role = 'admin', full_name = 'Neşeli Otomotiv', phone = '+905000000000'
--    where id = '<kullanici-uuid>';
-- Sonra aşağıdaki sorguyu çalıştırın (seller = ilk admin kullanıcı).

with seller as (
  select id from public.profiles where role = 'admin' order by created_at limit 1
)
insert into public.listings
  (seller_id, title, description, price, brand, model, series, year, km, fuel_type, transmission, body_type, color, city, district, is_featured, cover_image_url)
select seller.id, v.*
from seller, (values
  ('Temiz 2020 Fiat Egea 1.4 Fire Urban', 'Hatasız, boyasız, bakımları yetkili serviste yapıldı.', 785000::numeric, 'Fiat', 'Egea', '1.4 Fire Urban', 2020, 68000, 'benzin', 'manuel', 'Sedan', 'Beyaz', 'İstanbul', 'Kadıköy', true, 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200'),
  ('2019 Renault Clio 1.5 dCi Touch', 'Düşük yakıt, değişen yok, 2 parça boya.', 690000, 'Renault', 'Clio', '1.5 dCi Touch', 2019, 112000, 'dizel', 'manuel', 'Hatchback', 'Gri', 'Ankara', 'Çankaya', false, 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200'),
  ('2022 Toyota Corolla 1.8 Hybrid Dream', 'Garantisi devam ediyor, ilk sahibinden.', 1450000, 'Toyota', 'Corolla', '1.8 Hybrid Dream', 2022, 34000, 'hibrit', 'otomatik', 'Sedan', 'Siyah', 'İzmir', 'Bornova', true, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200')
) as v(title, description, price, brand, model, series, year, km, fuel_type, transmission, body_type, color, city, district, is_featured, cover_image_url);
