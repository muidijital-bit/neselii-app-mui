# MVP Değişiklik Notları

Müşterinin modül seçim formundaki **"İlk aşama"** maddeleri adım adım uygulanıyor. Madde numaraları formdaki ve "MVP Çözüm Listesi" PDF'indeki numaralardır.
Her değişiklik hem müşteri hem yönetici tarafında Supabase ile çalışır; mevcut UI tasarımı korunur (yeni bölümler mevcut beyaz bölüm / kart diliyle eklenir).

Supabase migration dosyaları: `supabase/migrations/` (canlı projeye uygulanmıştır).

---

## Adım 1 — Talepler (2026-11-18) · TestFlight 1.0.0 (2)

### Madde 28 — Beni arayın
- **Müşteri:** İlan detayında fiyatın altında **"Sizi arayalım"** bölümü ve **Beni Arayın** butonu (satılmış ilanda ve yöneticide gizli).
- **Müşteri:** Talep formu: konu, uygun gün (önümüzdeki 7 gün veya "Fark etmez"), saat aralığı, telefon (profilden dolu gelir), not.
- **Müşteri:** Gönderim sonrası "Talebiniz alındı · Danışmanınız *X* sizi arayacaktır" ekranı.
- **Müşteri:** Profil → **Taleplerim** (durum, danışman, arama zamanı).
- **Veritabanı:** `leads` tablosu; müşteri yalnız kendi talebini görür/oluşturur, durumu değiştiremez.

### Madde 18 — Finansman danışmanı talebi
- Ayrı modül değil, aynı formda **konu: Finansman / kredi** seçeneği (Adım 2'de hesaplayıcının planı talebe eklendi).

### Madde 14 — Görüntülü inceleme randevusu
- Aynı formda **konu: Görüntülü inceleme** + gün/saat aralığı seçimi.

### Madde 30 — Danışman atama
- **Veritabanı:** Yeni talebe tetikleyici ile **rastgele aktif danışman** atanır (`advisors` tablosu).
- **Yönetici:** Talep detayında danışman değiştirilebilir.

### Talepler — yönetici tarafı
- Profil → **Talepler** (yanında "Yeni" talep sayısı); Yeni / Görüşülüyor / Tamamlandı / İptal süzgeci.
- Talep detayı: müşteri adı ve telefonu, **Müşteriyi Ara**, durum değiştirme, danışman değiştirme.
- **Bildirimler:** Yeni talepte tüm yöneticilere "Yeni talep: *Müşteri*"; durum/danışman değişince müşteriye "Talebiniz güncellendi". Bildirime dokununca talep detayı açılır.

---

## Danışman yönetimi (2026-11-18)

### Madde 30 — Danışman atama (devamı)
- **Yönetici:** Profil → **Danışmanlar**: liste (aktif/pasif), **Danışman Ekle**, düzenle (ad, telefon, aktif/pasif), **sil** (onaylı).
- Pasif danışmana yeni talep atanmaz; mevcut talepleri kalır.
- **Veritabanı:** Silinen danışmanın açık talepleri başka bir aktif danışmana aktarılır, müşteriye "Danışmanınız: …" bildirimi gider. Kapalı taleplerde danışman boşalır (bildirim gitmez).
- Başlangıç danışmanları örnektir (Ahmet Yılmaz, Mehmet Kaya, Ayşe Demir); firma kendi ekibiyle değiştirir.

---

## Adım 2 — Finansman (2026-11-18)

### Madde 17 — Aylık ödeme hesaplayıcı
- **Müşteri:** İlan detayında **"Aylık ödeme hesapla"** bölümü: peşinat oranı (%30, %40…) ve vade seçilir; aylık taksit, kredi tutarı, toplam ödeme gösterilir (eşit taksitli kredi formülü).
- **Yönetici:** Profil → **Finansman Ayarları**: aylık faiz oranı, en düşük peşinat oranı, sunulan vadeler (6–60 ay). 1.000.000 TL'lik örnek plan canlı önizlenir.
- **Veritabanı:** `finance_settings` (tek satır; herkes okur, yalnız yönetici günceller). Varsayılan: aylık %2,99, en düşük peşinat %30, 12/24/36 ay.

### Madde 18 — Finansman danışmanı talebi (devamı)
- **Müşteri:** Hesaplayıcıdaki **"Bu plan için beni arayın"** talep formunu konu *Finansman* ve seçilen ödeme planıyla açar.
- **Yönetici:** Talep detayında müşterinin **ödeme planı** (peşinat, vade, taksit, toplam) görünür. Plan `leads.data.plan` alanında saklanır.

### Madde 23 — Aylık bütçeye göre araç bulma
- **Müşteri:** Ana sayfa kısayollarının başında **"Bütçeme göre"**: aylık ödenebilecek tutar, peşinat, vade girilir; firmanın oranı ve en düşük peşinat kuralıyla alınabilecek **en yüksek fiyat** hesaplanır; **"N ilanı göster"** o fiyata kadar olan ilanları listeler.

---

## Adım 3 — Araç bilgileri (2026-11-18)

### Madde 12 — Neşeli güven puanı
- **Müşteri:** İlan detayında **"Neşeli Güven Puanı"** bölümü: 0–100 puan, değerlendirme (Çok iyi / İyi / Sınırlı bilgi), ilerleme çubuğu ve kontrol maddeleri (karşılanan yeşil tik, karşılanmayan gri).
- Kontrol maddeleri: Ekspertiz yapıldı · Bakımları zamanında yapıldı · Ağır hasar kaydı yok · Muayenesi geçerli · Ruhsat ve belgeler tam · Yetkili servis kayıtları var.
- Puan = karşılanan madde / toplam × 100 (uygulamada hesaplanır).

### Madde 11 — Bakım ve kullanım geçmişi
- **Müşteri:** İlan detayında **"Araç Geçmişi"** bölümü: önceki kullanım, sahip sayısı, son bakım (tarih · km), not.

### Madde 13 — Uzman görüşü
- **Müşteri:** İlan detayında **"Uzman Görüşü"** bölümü: danışman adı, **Güçlü yönler** (yeşil) ve **Dikkat edilecekler** (turuncu) maddeleri.

### Madde 11–13 — yönetici tarafı
- **Yönetici:** İlan detayında **"Yönetici: araç bilgileri"** bölümü → **Bilgileri Gir / Düzenle** ekranı:
  - Güven kontrolleri (açma/kapama, canlı puan),
  - Araç geçmişi (kullanım türü çipleri + serbest metin, sahip sayısı, son bakım km ve tarihi GG.AA.YYYY, not),
  - Uzman görüşü (danışman seçimi, her satıra bir madde güçlü yönler / dikkat edilecekler).
- Bölümler yalnız veri girilmişse müşteriye gösterilir.
- **Veritabanı:** `listing_insights` (ilan başına tek satır; görünür ilanın bilgisi herkese açık, yazma yalnız yönetici).

---

## Adım 4 — Arama ve karar destek (2026-11-18)

### Madde 3 — Ticari araca özel filtreler
- **Müşteri:** Filtre ekranında yeni bölümler: **Tonaj** (en az / en fazla, ton), **Motor gücü** (en az / en fazla, HP), **Kabin tipi** (Normal / Yüksek tavan / Yataklı; kamyon ve çekicide). Sonuç ekranında çip olarak görünür, çipten kaldırılabilir, kayıtlı aramaya dahildir.
- **Müşteri:** İlan detayı **Özellikler** tablosunda yeni satırlar: Tonaj, Motor Gücü, Kabin, **Şasi**, **Üstyapı** (girilmişse).
- **Yönetici:** İlan detayı → "Yönetici: araç bilgileri" → **Teknik bilgiler** bölümü: tonaj, motor gücü, kabin tipi, şasi, üstyapı.
- **Veritabanı:** Bilgiler `listings.attributes` içinde (`tonnage_t`, `engine_hp`, `cab_type`, `chassis`, `body_builder`); yalnız yöneticinin çağırabildiği `set_listing_specs` fonksiyonu bu anahtarları yazar, diğerlerini (finansman, kaynak) korur.
- **Not:** sahibinden'den aktarılan ilanlarda bu bilgiler yok; yönetici girdikçe filtrelerde eşleşir.

### Madde 4 — Araç karşılaştırma
- **Müşteri:** İlan detayında üstte (paylaş ve favorinin yanında) **karşılaştır** düğmesi; en fazla 3 ilan. Eklenince/çıkarılınca altta kısa bilgi notu ("Karşılaştırmaya eklendi (2/3)").
- **Müşteri:** Liste doluyken ilan detayında ve sonuç ekranında lacivert **"Karşılaştır (n/3)"** düğmesi.
- **Müşteri:** **Karşılaştır** ekranı: ilanların fotoğrafı ve başlığı yan yana, altında satır satır fiyat, **aynı peşinat ve vadeyle tahmini aylık ödeme** (firmanın finansman ayarları), model yılı, kilometre, kategori/tip, marka/model, tonaj, motor gücü, kabin, çekiş, güven puanı, finansman, konum. **Farklı olan satırlar vurgulanır.** İlan çıkarma ve "Temizle".
- Seçimler cihazda tutulur; üyelik veya veritabanı değişikliği gerekmez.

### Madde 1 — Sektöre göre başlangıç
- **Müşteri:** Tanıtıma yeni 2. adım **"Aracı hangi iş için kullanacaksınız?"**: İnşaat / şantiye, Lojistik / uzun yol, Şehir içi dağıtım, Soğuk zincir, Akaryakıt / tanker, Tarım / hayvancılık ("Şimdi Değil" ile geçilebilir).
- **Müşteri:** Ana sayfada kısayolların altında **"Size uygun araçlar"** kartı: sektör seçilmediyse soru ve sektör çipleri; seçildiyse o sektöre uygun araç türleri (ör. İnşaat → Damperli kamyon, Damper dorse, Çekici), dokununca arama açılır; **Değiştir** ile sektör değiştirilir.
- Seçim cihazda tutulur (tanıtımı daha önce görmüş kullanıcılar ana sayfadan seçer).

### Madde 2 — Akıllı araç bulucu
- **Müşteri:** Ana sayfa kısayollarında **"Araç bulucu"** ve sektör kartındaki **"Araç Bulucu: 4 soruda size uygun aracı bulalım"** bağlantısı.
- **Müşteri:** 4 adımlı sihirbaz (ilerleme çubuğu, Geri / Devam):
  1. Kullanım amacı (sektörler + "Diğer / emin değilim"),
  2. Yük (Hafif ≤3,5 ton kamyonet / Orta 3,5–18 ton kamyon / Ağır 18 ton+ çekici veya ağır kamyon),
  3. Bütçe (Fark etmez / Peşin toplam bütçe / Kredili: aylık ödeme + peşinat → firmanın oranıyla en yüksek fiyat),
  4. Özet ve **"N ilanı göster"**; bütçede ilan yoksa **"Bütçesiz göster"**.
- Cevaplar normal aramaya çevrilir (kategori, alt tür, en yüksek fiyat); sonuç ekranında filtreler değiştirilebilir ve kaydedilebilir.

### Madde 24 — Toplam sahip olma maliyeti
- **Müşteri:** İlan detayındaki "Aylık ödeme hesapla" bölümünde **"Toplam sahip olma maliyetini hesapla"** bağlantısı → yeni ekran:
  - Yıllık km (50.000 / 100.000 / 150.000 / 200.000 veya serbest), ortalama tüketim (kategoriye göre dolu gelir, değiştirilebilir), alım şekli (Peşin / Kredili),
  - Sonuç: **tahmini aylık maliyet**, yıllık toplam, km başına işletme maliyeti; kalem kalem yakıt, bakım, lastik, sigorta/kasko, vergi (MTV) ve kredili alımda ilk yılın taksitleri.
- **Yönetici:** Profil → Finansman Ayarları'na **"Maliyet varsayılanları"** bölümü: motorin fiyatı (TL/L), kategoriye göre tüketim (Kamyon, Çekici, Ticari araç; L/100 km), bakım ve lastik (TL/km), sigorta ve vergi (TL/yıl).
- **Veritabanı:** `finance_settings` tablosuna maliyet sütunları eklendi (varsayılan: motorin 55 TL, tüketim kamyon 28 / çekici 32 / ticari 11, bakım 2,5 TL/km, lastik 1,2 TL/km, sigorta 75.000 TL, vergi 25.000 TL — firma kendi değerleriyle günceller).

## Sıradaki adımlar
- **Adım 5:** Madde 6 (push + benzer araç bildirimi), 27 (arama kaydı), 31 (randevu yönetimi).
