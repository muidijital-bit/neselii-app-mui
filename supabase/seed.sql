-- Örnek veri (tasarımlardaki ilanlar). Migration'dan sonra SQL Editor'de çalıştırın.
-- Fotoğraf eklenmez; uygulama fotoğrafsız ilanlarda yer tutucu gösterir.

insert into public.listings
  (category_slug, subtype, title, description, price, brand, model, year, km, attributes,
   city, district, status, published_at)
values
  ('cekici', '4×2', 'Mercedes-Benz Actros 1845 LS Çekici',
   'Bakımları yetkili serviste yapıldı. Ekspertiz ve bakım kayıtları randevuda paylaşılır.',
   2850000, 'Mercedes-Benz', 'Actros 1845 LS', 2019, 420000, '{"cab_type":"Yüksek"}',
   'Ankara', 'Yenimahalle', 'published', now() - interval '7 days'),
  ('ticari-arac', 'Panelvan', 'Ford Transit 350 L Uzun Şasi Panelvan',
   'Filo aracı, düzenli bakımlı.', 985000, 'Ford', 'Transit 350 L', 2021, 158000, '{}',
   'Ankara', 'Yenimahalle', 'published', now() - interval '14 days'),
  ('dorse', 'Damper', 'Tırsan 3 Akslı Kapaklı Damper Dorse',
   'Hardox kasa, lastikler yeni.', 1150000, 'Tırsan', 'Damper', 2018, null, '{"axle_count":"3"}',
   'Yozgat', 'Sorgun', 'published', now() - interval '15 days'),
  ('kamyon', 'Damperli', 'Ford Trucks 2533 DC Damperli Kamyon',
   'Şantiye kullanımına hazır.', 2150000, 'Ford Trucks', '2533 DC', 2017, 510000, '{"axle_count":"3"}',
   'Ankara', 'Yenimahalle', 'published', now() - interval '16 days'),
  ('cekici', '4×2', 'MAN TGX 26.480 Çekici',
   'Retarderli, ADR uygun.', 2450000, 'MAN', 'TGX 26.480', 2018, 610000, '{"cab_type":"Yüksek"}',
   'Ankara', 'Yenimahalle', 'unpublished', now() - interval '21 days'),
  ('cekici', '6×2', 'Volvo FH 500 Globetrotter Çekici',
   'I-Shift şanzıman, full bakımlı.', 3100000, 'Volvo', 'FH 500', 2020, 380000, '{"cab_type":"Yüksek"}',
   'Ankara', 'Sincan', 'published', now() - interval '3 days'),
  ('kamyon', 'Kasalı', 'Mercedes-Benz Axor 1833 Kasalı Kamyon',
   'Yandan kapaklı kasa.', 1650000, 'Mercedes-Benz', 'Axor 1833', 2014, 690000, '{"axle_count":"2"}',
   'Konya', 'Selçuklu', 'published', now() - interval '4 days'),
  ('dorse', 'Tenteli', 'Kässbohrer Tenteli Dorse',
   'Perdeli, sürgülü tavan.', 890000, 'Kässbohrer', 'Tenteli', 2019, null, '{"axle_count":"3"}',
   'Ankara', 'Sincan', 'published', now() - interval '6 days');

insert into public.announcements (title, body, published_at) values
  ('Sincan şubemiz hizmete açıldı',
   'Neşeli Otomotiv Sincan şubesi hizmete açıldı. Şubemizde ilanlarımızı yerinde inceleyebilir, randevu alarak yetkili temsilcilerimizle görüşebilirsiniz.',
   now() - interval '14 days');
