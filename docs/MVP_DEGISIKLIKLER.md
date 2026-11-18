# MVP Değişiklik Notları

Müşterinin modül seçim formundaki **"İlk aşama"** maddeleri adım adım uygulanıyor. Madde numaraları formdaki ve "MVP Çözüm Listesi" PDF'indeki numaralardır.
Her değişiklik hem müşteri hem yönetici tarafında Supabase ile çalışır; mevcut UI tasarımı korunur (yeni bölümler mevcut beyaz bölüm / kart diliyle eklenir).

Supabase migration dosyaları: `supabase/migrations/` (canlı projeye uygulanmıştır).

Her maddenin müşteri ve yönetici tarafında nasıl test edileceği: **`docs/MVP_TEST_REHBERI.md`**.

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

## Adım 5 — İletişim, randevu ve bildirimler (2026-11-18)

### Madde 27 — Sabit telefon araması (kayıt ve sayılar)
- **Müşteri:** Değişiklik yok; "Hemen Ara" eskisi gibi telefonu açar. Her dokunuş arka planda kaydedilir (ilan detayında ilan bazında, ana sayfadaki "Hemen Ara" genel arama olarak). Kayıt başarısız olsa da arama engellenmez.
- **Yönetici:** İlan detayındaki "Yönetici: araç bilgileri" bölümünde **"Hemen Ara: toplam N · son 30 gün M"**.
- **Yönetici:** Profil → **Arama Kayıtları**: üstte Bugün / Son 7 gün / Toplam; altta en yeni önce müşteri adı, aranan ilan (dokununca açılır), tarih-saat ve profilinde telefon varsa **geri arama** düğmesi.
- **Veritabanı:** `call_logs` tablosu (müşteri yalnız kendi adına yazar, yalnız yönetici okur; güncelleme/silme kapalı).

### Madde 31 — Randevu yönetimi (+ madde 14, 15: inceleme ve ekspertiz randevusu)
- **Müşteri:** "Beni Arayın" formuna iki yeni konu: **Yerinde inceleme randevusu** ve **Ekspertiz randevusu** (görüntülü inceleme zaten vardı).
- **Yönetici:** Talep detayında **Randevu** kartı: önümüzdeki 14 gün ve 09:00–18:00 arası yarım saatlik saat seçimi (müşterinin tercih ettiği gün/saat ön seçili), **Randevu Oluştur / Güncelle / Kaldır**. Randevu atanınca "Yeni" talep otomatik "Görüşülüyor" olur.
- **Müşteri:** Randevu atanınca **"Randevunuz oluşturuldu · Yerinde inceleme · 21.11.2026 14:00"** bildirimi; talep detayında ve Taleplerim listesinde **"Randevu: Yarın, 14:00"**.
- **Hatırlatma:** Randevudan **24 saat önce** müşteriye "Randevu hatırlatması", yöneticilere "Yaklaşan randevu: *Müşteri*" bildirimi (sunucuda her 15 dakikada bir çalışan zamanlanmış görev; randevu değişirse yeniden hatırlatır).
- **Yönetici:** Profil → **Randevular**: bugünden itibaren tüm randevular güne göre gruplu (Bugün, Yarın, Cum 21 Kas…): saat, müşteri, konu, ilan, danışman, durum; dokununca talep detayı.
- **Veritabanı:** `leads` tablosuna `appointment_at`, `reminder_sent_at`; konu kısıtına `inspection`, `expertise`; `pg_cron` ile `appointment-reminders` görevi.

### Madde 6 — Fiyat ve stok bildirimleri (telefona bildirim + benzer araç)
- **Müşteri ve yönetici:** Uygulama içindeki **her bildirim artık telefona da gönderilir** (push): fiyat değişikliği, durum değişikliği (rezerve/satıldı), yeni ilan, mesaj, duyuru, talep ve randevu bildirimleri. Bildirime dokununca ilgili ekran açılır (ilan, sohbet, talep, duyuru). Uygulama açıkken gelen bildirim üstte banner olarak görünür ve bildirim listesi/sayacı yenilenir.
- **Müşteri:** Yeni **"Beğendiğiniz araca benzer yeni ilan"** bildirimi: yayına giren ilan, kullanıcının favorisindeki bir ilanla **aynı kategori ve alt türde, fiyatı ±%15 içinde** ise. Kullanıcı başına **günde en fazla bir** benzer araç bildirimi; aynı ilan için zaten "yeni ilan" bildirimi aldıysa tekrar gönderilmez. Bildirim Tercihleri'ndeki **"Yeni ilanlar"** anahtarıyla açılıp kapanır.
- Bildirim izni yalnızca tanıtımda / tercihlerde istenir; izin verilmişse cihaz otomatik kaydolur. **Çıkış yapınca** cihaz o hesabın bildirimlerini almayı bırakır; aynı telefonda başka hesap açılırsa bildirimler yeni hesaba gider.
- **Veritabanı:** Bildirim yazıldığında sunucu Expo Push servisine gönderir (`pg_net`, `notifications_send_push` tetikleyicisi); `register_push_token` / `unregister_push_token` fonksiyonları; yeni bildirim türü `similar_listing` ve `listings_notify_similar` tetikleyicisi.
- **Dış kurulum gerekli (iOS TestFlight / App Store):** Telefona bildirimin iOS sürümünde çalışması için Apple Developer hesabında bir **APNs anahtarı (.p8)** oluşturulup Expo'ya (EAS credentials) yüklenmeli, uygulama kimliğinde **Push Notifications** yeteneği açılıp imza profili yenilenmeli ve yeni build alınmalı (şu an iOS build'den push yetkisini kaldıran `withoutPushEntitlement` eklentisi bu kurulumla birlikte kaldırılacak). Android'de Expo Go push'u desteklemez; Android için de FCM anahtarı gerekir.

## Adım 6 — "Sonraki" maddeleri: talep altyapısı üzerine (2026-11-18) · TestFlight 1.0.0 (3) Adım 5'e kadar olanları içerir

### Madde 26 — Sigorta ve kasko talebi
- **Müşteri:** "Beni Arayın" formuna yeni konu **"Sigorta / kasko teklifi"**. Danışman teklifi müşteriye iletir (talep akışı aynı).
- **Yönetici:** Talepler'de "Sigorta / kasko" konulu talep olarak görünür; durum/danışman/randevu yönetimi aynı.

### Madde 44 — Çoklu araç ve filo teklifi
- **Müşteri:** **Karşılaştır** ekranında (2–3 ilan seçiliyken) **"N araç için toplu teklif iste"** → "Toplu Teklif" formu: seçilen araçlar listelenir, gün/saat, telefon, not ile tek talep gönderilir.
- **Yönetici:** Talep detayında **"Toplu teklif istenen araçlar (N)"** kartı: araçlar ve talep anındaki fiyatları; dokununca ilan açılır.
- **Veritabanı:** Konu `fleet_quote`; araçların özeti talebin `data.fleet` alanında saklanır.

### Madde 33 — Araç rezervasyonu
- **Müşteri:** İlan detayındaki "Sizi arayalım" bölümünde (yayındaki ilanlarda) **"Rezerve Et"** → konu "Aracı rezerve etmek istiyorum" ile talep formu.
- **Yönetici:** Rezervasyon talebinin detayında **Rezervasyon** kartı: **1 / 2 / 3 / 7 gün** seçip **Rezervasyonu Onayla** → ilan **"Rezerve"** olur, talep "Görüşülüyor"a geçer; **Rezervasyonu Kaldır** ile ilan yeniden yayına girer. Başka bir talep için zaten rezerve olan ilan ikinci kez rezerve edilemez.
- **Müşteri:** Onayda **"Rezervasyonunuz onaylandı · *İlan* · GG.AA.YYYY SS:DD tarihine kadar sizin için ayrıldı"** bildirimi; talep detayında "Araç … tarihine kadar sizin için rezerve"; ilan detayında fiyatın altında **"… tarihine kadar rezerve"**.
- **Otomatik bitiş:** Süre dolunca ilan otomatik yeniden yayına girer (her 15 dakikada kontrol); müşteriye "Rezervasyon sona erdi", yöneticilere "Rezervasyon süresi doldu" bildirimi.
- **Kapsam dışı:** Kapora / online ödeme (tartışılabilir madde; banka/ödeme entegrasyonu gerektirir).
- **Veritabanı:** `listings.reserved_until`, `reserved_lead_id`; `approve_reservation`, `release_reservation` (yalnız yönetici), `reservation-expiry` zamanlanmış görevi.

### Madde 16 — Belge kontrol listesi
- **Müşteri:** İlan detayındaki "Sizi arayalım" bölümünde **"Satın alma için gerekli belgeler"** → **Gerekli Belgeler** ekranı: **Bireysel alım / Kurumsal alım** sekmeleri, adım adım belge listesi (kimlik, finansman, noter satışı, teslimat öncesi; kurumsalda vergi levhası, sicil gazetesi, imza sirküleri, faaliyet belgesi, bilanço…).
- **Not:** İçerik şimdilik uygulamada sabittir (firma içeriği); firma kendi listesini iletirse güncellenir.

## Adım 7 — Takas ve araç alım süreci (2026-11-18)

### Madde 35 — Takas ön başvurusu
- **Müşteri:** İlan detayında "Sizi arayalım" bölümünde **"Aracımı takasa vermek istiyorum"** ve Profil → **"Aracımı Sat / Takasla"** → **Takas / Aracımı Sat** formu: işlem türü (Takas / Sadece satış), takasta alınmak istenen ilan kartı, araç kategorisi (Kamyon, Çekici, Dorse, Ticari araç), marka, model, model yılı, kilometre, hasar durumu (Hasarsız / Boyalı-değişen / Hasarlı), beklenen fiyat, uygun saat, telefon, not.
- Gönderince talep açılır (konu "Takas"), danışman atanır, yöneticilere bildirim gider; "Başvurunuz alındı · Danışmanınız … ön değerlendirmeyi iletecek".

### Madde 36 — Fotoğraf ve video yükleme
- **Müşteri:** Formda **Dış görünüm, Kabin içi, Motor, Kasa / üstyapı** bölümleri; her bölüme galeriden en fazla 6 fotoğraf/video (video ≤ 60 sn, dosya ≤ 100 MB); küçük resimler ve kaldırma. En az bir fotoğraf zorunlu. Gönderimde "Dosyalar yükleniyor (3/8)" ilerlemesi; yüklenemeyen dosya varsa sayısı gösterilir.
- **Yönetici:** Talep detayında bölümlere göre fotoğraf/video şeridi; dokununca dosya açılır.
- **Veritabanı / depolama:** Özel `trade-in` depolama alanı (yalnız dosya sahibi ve yönetici erişir, süreli imzalı adres), `trade_in_media` tablosu. Galeri izni metni eklendi (`expo-image-picker`; kamera/mikrofon izni istenmez).

### Madde 37 — Ön değerlendirme aralığı
- **Yönetici:** Talep detayında **Ön değerlendirme** kartı: en az / en çok TL → **Değerlendirmeyi Gönder / Güncelle**.
- **Müşteri:** **"Aracınızın ön değerlendirmesi hazır · Marka Model · 2.100.000 TL – 2.300.000 TL"** bildirimi; talep detayında yeşil değer aralığı (değerlendirme gelene kadar "Danışmanınız aracınızı inceliyor").

### Madde 38 — Takas farkı hesabı
- **Müşteri ve yönetici:** Takas talebinde ilan seçiliyse ve değerlendirme varsa **"Ödenecek fark: X – Y TL"** ve **farkın aylık taksiti** (peşinatsız, finansman ayarlarındaki en uzun vade ve faizle). Araç ilandan değerliyse "Size ödenecek" gösterilir. "Kesin tutar ekspertiz sonrası netleşir" notu.

### Madde 39 — Ekspertiz randevusu (takas aracı)
- **Yönetici:** Talep detayındaki **Randevu** kartına **randevu yeri** seçimi: Firmamızda / Müşterinin adresinde / Ekspertiz merkezinde (tüm randevularda kullanılabilir).
- **Müşteri:** "Randevunuz oluşturuldu · Takas · 20.11.2026 18:41 · Firmamızda"; yer değişince "Randevunuz güncellendi". Talep detayında "Randevu: … · Firmamızda".

### Madde 40 — Araç satın alma talebi
- **Müşteri:** Aynı formda **"Sadece aracımı satmak"** seçeneği (konu "Araç satış"; ilan bağlantısı yok).
- **Yönetici:** Profil → **"Takas ve Alım Talepleri"**: yalnız takas ve araç satış talepleri (ayrı liste, durum süzgeçli). Genel Talepler listesinde de konu adıyla görünür.

**Not:** `expo-image-picker` yerel modül eklendi → bu özellik TestFlight'ta **yeni build (4)** ile çalışır; Expo Go'da hemen çalışır.

## Adım 8 — Belgeler (2026-11-18) · TestFlight 1.0.0 (4) Adım 7'ye kadar olanları içerir

### Madde 9 — Araç sağlık kartı
- **Müşteri:** İlan detayında güven puanının altında **"Araç Sağlık Kartı"**: ekspertiz özeti, mekanik durum, lastik durumu (% ve çubuk; %30 altı turuncu), muayene geçerlilik tarihi (süresi geçtiyse kırmızı "Muayene süresi doldu"), bilinen kusurlar.
- **Yönetici:** İlan detayı → "Yönetici: araç bilgileri" → **Araç sağlık kartı** bölümü: ekspertiz özeti, mekanik durum, lastik %, muayene geçerlilik (GG.AA.YYYY), bilinen kusurlar (her satıra bir madde).

### Madde 10 — Ekspertiz raporu (PDF)
- **Yönetici:** Aynı bölümde **"PDF Seç"** ile ekspertiz raporu yüklenir (en fazla 20 MB), **Değiştir / Kaldır**.
- **Müşteri:** Sağlık kartında **"Ekspertiz Raporunu Aç"** → rapor uygulama içi tarayıcıda açılır.
- **Depolama:** Herkese açık `listing-documents` alanı (yalnız yönetici yükler/siler).

### Madde 52 — Belge arşivi
- **Yönetici:** Talep detayında **Belgeler** kartı: **Dosya Seç (PDF / görsel)** → tür (Teklif, Ekspertiz, Teslimat, Sözleşme, Diğer) ve belge adı → **Müşteriye Gönder**; belgeyi silme (onaylı).
- **Müşteri:** **"Yeni belge eklendi · *Belge adı* · Profil → Belgelerim"** bildirimi; Profil → **Belgelerim**: tüm belgeler (tür etiketi, tarih), dokununca açılır; talep detayında da o talebin belgeleri.
- **Veritabanı / depolama:** `customer_documents` tablosu ve özel `customer-documents` alanı (yalnız belge sahibi müşteri ve yönetici erişir, süreli imzalı adres).

### Madde 32 — Teklif oluşturma (PDF)
- **Yönetici:** Talep detayı → Belgeler → **"Teklif Oluştur (PDF)"**: araç(lar) (toplu teklifte tümü) ve liste fiyatı, **teklif tutarı** (düşük girilirse indirim olarak gösterilir), **ödeme şekli** Peşin / Kredili (peşinat oranı ve vade; müşterinin hesaplayıcı planı varsa ön seçili), **geçerlilik** 3/7/15 gün, not → **"PDF Oluştur ve Gönder"**.
- PDF cihazda üretilir (firma başlığı, teklif no, müşteri, danışman, araçlar, indirim, teklif tutarı, ödeme planı, not, geçerlilik), müşterinin Belgelerim'ine yüklenir; müşteriye **"Teklifiniz hazır"** bildirimi gider.

**Not:** `expo-document-picker` ve `expo-print` yerel modülleri eklendi → TestFlight'ta yeni build (5) ile çalışır; Expo Go'da hemen çalışır.

## Sıradaki adımlar
- iOS push için APNs kurulumu (Apple hesabında anahtar gerekir) ve yeni TestFlight build'i.
- **Adım 9 önerisi — Finansman ve sektör:** Madde 20 (çoklu banka teklif karşılaştırma), 21 (kurumsal finansman başvurusu), 41 (inşaat soruları), 43 (şehir içi dağıtım soruları).
- **Sonra:** 46 (içerik merkezi), 47/51 (kurumsal hesap ve onay akışı), 7 (video bölümleri).
