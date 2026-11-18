# MVP Test Rehberi

Bu rehber, `docs/MVP_DEGISIKLIKLER.md` dosyasındaki her maddenin uygulamada **müşteri** ve **yönetici** tarafından nasıl test edileceğini adım adım anlatır. Madde numaraları müşterinin modül seçim formundaki numaralardır.

Her test adımı bir kutucuktur (`- [ ]`); test ederken işaretleyebilirsiniz. **Beklenen** satırı, adım doğru çalışıyorsa ne görmeniz gerektiğini söyler.

---

## 0. Hazırlık

### Hesaplar

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Müşteri | `demo.musteri@neseli.test` | `Neseli2026` |
| Yönetici | `demo.yonetici@neseli.test` | `Neseli2026` |

- Yönetici girişinde ekran başlıklarının sağında lacivert **"Yönetici"** rozeti görünür. Rozet yoksa müşteri hesabıyla girmişsinizdir.
- Yönetici yetkisi uygulamadan verilemez, yalnızca veritabanından verilir. Yeni bir hesabı yönetici yapmak gerekirse geliştiriciye iletin.

### Hangi uygulama sürümü?

- **TestFlight 1.0.0 (4)** Adım 1–7'yi içerir; Adım 8 (belgeler) build 5 ile gelir. Eski build'ler: (3) Adım 1–5, (2) yalnız Adım 1. Adım 8 için yeni bir sürüm gerekir:
  - **Expo Go önizlemesi** (en hızlısı): geliştirici yeni önizlemeyi yayımlar (`npm run preview:expo-go`). Test eden kişi Expo Go'da, `neseli-otomotiv` organizasyonuna davet edilmiş Expo hesabıyla giriş yapar.
  - **Yeni TestFlight build'i** (build 3 ve sonrası).
- Veritabanı tarafındaki tüm değişiklikler zaten canlıdadır. Yeni sürümü açan herkes aynı verileri görür.

### Önerilen düzen

- **İki telefon** (biri müşteri, biri yönetici) en kolayıdır: bir tarafta yapılan işlemin diğer tarafa bildirim olarak düştüğünü anında görürsünüz.
- Tek telefonla test ediyorsanız: Profil → **Çıkış Yap** → diğer hesapla giriş yapın.
- Bildirimleri görmek için alt menüdeki **Bildirimler** sekmesini kullanın. Telefona gelen (push) bildirimler için bkz. Madde 6.

### Test verisini temizleme

- Test talepleri yönetici tarafında **"İptal edildi"** durumuna alınabilir. Uygulamada talep silme yok.
- Test için girilen ilan bilgileri (güven puanı, teknik bilgiler) yönetici ekranından boşaltılıp kaydedilerek kaldırılır.

---

## Adım 1: Talepler

### Madde 28: Beni arayın · Madde 18: Finansman talebi · Madde 14: Görüntülü inceleme

**Müşteri**
- [ ] Ana sayfadan satılmamış bir ilan açın. Fiyatın altında **"Sizi arayalım"** bölümünü ve **Beni Arayın** butonunu bulun.
  - **Beklenen:** Satılmış ilanda bu bölüm görünmez.
- [ ] **Beni Arayın** → formun üstünde ilanın fotoğrafı, başlığı ve fiyatı görünür.
- [ ] Konu seçeneklerini kontrol edin: *Bilgi almak istiyorum, Finansman / kredi, Görüntülü inceleme, Yerinde inceleme randevusu, Ekspertiz randevusu*.
- [ ] Bir gün (Bugün, Yarın, …) ve saat aralığı seçin.
- [ ] Telefon alanını kontrol edin.
  - **Beklenen:** Profilde telefon kayıtlıysa alan dolu gelir.
- [ ] Telefonu silip **Talebi Gönder**'e basın.
  - **Beklenen:** "Geçerli bir telefon numarası girin" uyarısı.
- [ ] Geçerli telefonla gönderin.
  - **Beklenen:** "Talebiniz alındı · **Danışmanınız *Ad Soyad* sizi arayacaktır.**" Altında arama zamanı ve telefon görünür.
- [ ] **Talebimi Gör** → talep detayı açılır: konu, "Yeni" durumu, danışman adı, "Danışmanınız … sizi arayacaktır" notu.
- [ ] Profil → **Taleplerim** → talep listede görünür: konu, ilan, arama zamanı, danışman.

**Yönetici**
- [ ] **Bildirimler** sekmesine bakın.
  - **Beklenen:** "Yeni talep: *Müşteri adı*" (konu · ilan). Dokununca talep detayı açılır.
- [ ] Profil → **Talepler** satırını kontrol edin.
  - **Beklenen:** Yanında yeni talep sayısı var.
- [ ] Talepler listesinde üstteki süzgeçleri deneyin (Tümü / Yeni / Görüşülüyor / Tamamlandı / İptal edildi).
  - **Beklenen:** Liste varsayılan olarak "Yeni" açılır.
- [ ] Talep detayına girin: müşteri adı, telefon, arama zamanı, danışman, not.
- [ ] **Müşteriyi Ara** → telefon uygulaması müşterinin numarasıyla açılır.
- [ ] **Durum** bölümünde **Görüşülüyor**'a basın.

**Müşteri (kontrol)**
- [ ] Bildirimler'de **"Talebiniz güncellendi · Bilgi talebi · Görüşülüyor"** görünür; dokununca talep açılır.

### Madde 30: Danışman atama

**Yönetici**
- [ ] Talep detayında **Danışman** satırına dokunun → listeden başka bir danışman seçin.

**Müşteri (kontrol)**
- [ ] Bildirim gelir: **"Danışmanınız: *Yeni ad*"**.
- [ ] Talep detayında yeni danışman adı görünür.

---

## Danışman yönetimi (Madde 30 devamı)

**Yönetici**
- [ ] Profil → **Danışmanlar** → danışmanlar listelenir. Üstte aktif danışman sayısı yazar.
- [ ] **Danışman Ekle** → ad soyad ve telefon girin → **Kaydet**.
  - **Beklenen:** Yeni danışman listede görünür.
- [ ] Ad alanını boş bırakıp kaydetmeyi deneyin.
  - **Beklenen:** "Danışmanın adını girin" uyarısı.
- [ ] Bir danışmana dokunun → adını değiştirin → **Aktif** anahtarını kapatın → Kaydet.
  - **Beklenen:** Listede gri avatar ve **"Pasif"** etiketi.
- [ ] Pasif danışmanın yeni talep almadığını doğrulayın.
  - **Beklenen:** Müşteri tarafında birkaç yeni talep açın; hiçbiri pasif danışmana atanmaz.
- [ ] Açık talebi olan bir danışmanı silin: düzenleme ekranında **Danışmanı Sil** → onay penceresinde **Sil**.
  - **Beklenen:** Danışman listeden kalkar; açık talepleri başka bir aktif danışmana geçer.

**Müşteri (kontrol)**
- [ ] Silinen danışmanın açık talebi olan müşteriye **"Danışmanınız: *Yeni ad*"** bildirimi gelir.

---

## Adım 2: Finansman

### Madde 17: Aylık ödeme hesaplayıcı

**Yönetici (önce ayarlar)**
- [ ] Profil → **Finansman Ayarları**. Aylık faiz, en düşük peşinat oranı ve vadeleri görün.
- [ ] Faizi değiştirin (ör. `3,10`) → alttaki **"Örnek: 1.000.000 TL araç"** planı anında değişir → **Kaydet**.
  - **Beklenen:** "Ayarlar kaydedildi" mesajı.
- [ ] Tüm vadelerin seçimini kaldırın.
  - **Beklenen:** "En az bir vade seçin" uyarısı; Kaydet pasif.

**Müşteri**
- [ ] Bir ilan açın → **"Aylık ödeme hesapla"** bölümü.
- [ ] Peşinat oranını (%30, %40, …) ve vadeyi değiştirin.
  - **Beklenen:** Aylık taksit, peşinat, kredi tutarı, vade ve toplam ödeme anında değişir.
- [ ] Bölümün açıklamasını kontrol edin.
  - **Beklenen:** Yöneticinin girdiği faiz oranı yazar (ör. "aylık %3,10 faizle").

### Madde 18: Hesaplayıcıdan finansman talebi

**Müşteri**
- [ ] Hesaplayıcıda bir plan seçin → **"Bu plan için beni arayın"**.
  - **Beklenen:** Talep formu, konu **Finansman / kredi** seçili olarak açılır; "Ödeme planınız" kutusunda seçilen plan görünür.
- [ ] Konuyu "Bilgi"ye çevirin.
  - **Beklenen:** Plan kutusu kaybolur.
- [ ] Konuyu tekrar "Finansman"a alıp gönderin.

**Yönetici**
- [ ] Talep detayında **"Ödeme planı"** kartını kontrol edin.
  - **Beklenen:** Peşinat, kredi, vade, aylık taksit, toplam ödeme görünür.

### Madde 23: Aylık bütçeye göre araç bulma

**Müşteri**
- [ ] Ana sayfada kısayolların ilki **"Bütçeme göre"**.
- [ ] Aylık tutar (ör. `100.000`) ve peşinat (ör. `750.000`) girin; vadeyi değiştirin.
  - **Beklenen:** "Alabileceğiniz en yüksek araç fiyatı" hesaplanır.
- [ ] Peşinatı çok düşük girin (ör. `100.000`).
  - **Beklenen:** En yüksek fiyat, en düşük peşinat oranına göre sınırlanır. Örneğin en düşük oran %30 ise 100.000 TL peşinatla en fazla ~333.333 TL çıkar.
- [ ] **"N ilanı göster"** → sonuç ekranı.
  - **Beklenen:** Fiyat çipi "En fazla … TL"; listedeki ilanlar bu fiyatın altında.

---

## Adım 3: Araç bilgileri

### Madde 11, 12, 13: Yönetici girişi

**Yönetici**
- [ ] Bir ilan açın → aşağıda **"Yönetici: araç bilgileri"** bölümü → **Bilgileri Gir**.
- [ ] **Güven kontrolleri**: birkaç anahtarı açın.
  - **Beklenen:** Sağ üstteki **"Puan: N/100"** anında değişir. Örneğin 6 maddeden 5'i açıksa 83.
- [ ] **Araç geçmişi**: "Uzun yol" çipini seçin. Sahip sayısı `1`, son bakım km `480000` girin. Tarihi önce `31.02.2026` girin.
  - **Beklenen:** Kaydette "GG.AA.YYYY biçiminde girin" uyarısı.
- [ ] Tarihi geçerli bir değerle düzeltin, not yazın.
- [ ] **Uzman görüşü**: danışman seçin.
- [ ] Güçlü yönlere her satıra bir madde yazın (2–3 satır); aynısını dikkat edilecekler için yapın.
- [ ] **Kaydet**.
  - **Beklenen:** İlan detayına dönülür; yönetici bölümünde "… müşteriye bu ilanda gösteriliyor".

### Madde 12: Neşeli güven puanı · Madde 11: Araç geçmişi · Madde 13: Uzman görüşü

**Müşteri**
- [ ] Aynı ilanı açın. **Özellikler**'in altında **"Neşeli Güven Puanı"** bölümü olmalı.
  - **Beklenen:** Puan, değerlendirme (Çok iyi / İyi / Sınırlı bilgi), ilerleme çubuğu. Karşılanan maddeler yeşil tikli, karşılanmayanlar gri.
- [ ] **"Araç Geçmişi"** bölümünü kontrol edin.
  - **Beklenen:** Önceki kullanım, sahip sayısı, son bakım (tarih · km), not.
- [ ] **"Uzman Görüşü"** bölümünü kontrol edin.
  - **Beklenen:** Danışman adı ve baş harfleri, yeşil "Güçlü yönler", turuncu "Dikkat edilecekler".
- [ ] Bilgi girilmemiş başka bir ilan açın.
  - **Beklenen:** Bu üç bölüm hiç görünmez.

---

## Adım 4: Arama ve karar destek

### Madde 3: Ticari araca özel filtreler

**Yönetici (önce veri)**
- [ ] Bir **çekici** ilanında **Bilgileri Düzenle** → **Teknik bilgiler**: Tonaj `40`, Motor gücü `480`, Kabin **Yüksek tavan**, Şasi ve Üstyapı → Kaydet.
- [ ] İkinci bir çekici ilanına farklı değerler girin (ör. `26` ton, `420` HP, **Normal**).
- [ ] İlan detayında **Özellikler** tablosunu kontrol edin.
  - **Beklenen:** Tonaj, Motor Gücü, Kabin, Şasi, Üstyapı satırları görünür.

**Müşteri**
- [ ] Ana sayfa → filtre düğmesi → kategori **Çekici**.
  - **Beklenen:** **Tonaj**, **Motor gücü**, **Kabin tipi** bölümleri görünür.
- [ ] Tonaj en az `30` girin.
  - **Beklenen:** Alttaki "N ilanı göster" sayısı yalnızca 40 tonluk ilanı sayar.
- [ ] Kabin tipi **Yüksek tavan** seçip sonuçları açın.
  - **Beklenen:** Sonuç ekranında "En az 30 ton", "Yüksek tavan kabin" çipleri; çipe dokununca o filtre kalkar.
- [ ] Tonaj en az `50`, en fazla `30` girin.
  - **Beklenen:** "En az değer en çok değerden büyük olamaz".
- [ ] Bu aramayı zil simgesiyle kaydedin → Profil → Kayıtlı Aramalarım'dan açın.
  - **Beklenen:** Aynı filtreler gelir.
- [ ] Kategori **Dorse** seçin.
  - **Beklenen:** Tonaj / motor / kabin bölümleri gizlenir.
- **Not:** sahibinden'den aktarılan ilanlarda bu bilgiler yok. Filtre, yalnızca yöneticinin bilgi girdiği ilanlarla eşleşir.

### Madde 4: Araç karşılaştırma

**Müşteri**
- [ ] Bir ilan açın → üstte paylaş ve kalbin solundaki **karşılaştır** düğmesine (iki yönlü simge) basın.
  - **Beklenen:** Altta "Karşılaştırmaya eklendi (1/3)"; düğme lacivert dolar; **"Karşılaştır (1/3)"** hap düğmesi çıkar.
- [ ] İki ilan daha ekleyin, sonra dördüncüyü deneyin.
  - **Beklenen:** "En fazla 3 ilan karşılaştırabilirsiniz…"
- [ ] Bir arama sonuç ekranına gidin.
  - **Beklenen:** Altta "Karşılaştır (3/3)".
- [ ] **Karşılaştır** ekranını açın.
  - **Beklenen:** Üç ilanın fotoğrafı ve başlığı yan yana. Satırlar: fiyat, tahmini aylık (en düşük peşinat ve en uzun vadeyle), yıl, km, kategori, marka/model, teknik bilgiler, güven puanı, finansman, konum. **Farklı olan satırlar mavi zeminli ve kalın.**
- [ ] Bir ilanın köşesindeki **×** ile çıkarın; **Temizle** ile listeyi boşaltın.
  - **Beklenen:** "Karşılaştırma listeniz boş".
- [ ] Uygulamayı kapatıp açın.
  - **Beklenen:** Liste korunur (cihazda tutulur).

### Madde 1: Sektöre göre başlangıç

**Müşteri**
- [ ] Tanıtımdaki sektör sorusunu görmek için: Profil → **"Tanıtımı yeniden göster (test)"**. Bu satır yalnızca Expo Go / geliştirme sürümünde görünür.
  - **Beklenen:** 2. adımda **"Aracı hangi iş için kullanacaksınız?"** ve 6 sektör çipi.
- [ ] Bir sektör seçin (ör. *İnşaat / şantiye*) → Devam → tanıtımı bitirin.
- [ ] Ana sayfada kısayolların altındaki **"Size uygun araçlar · İnşaat / şantiye"** kartını kontrol edin.
  - **Beklenen:** Damperli kamyon, Damper dorse, Çekici çipleri; dokununca ilgili sonuçlar açılır.
- [ ] **Değiştir** → başka sektör seçin.
  - **Beklenen:** Kart yeni sektörün araç türlerini gösterir.
- [ ] Tanıtımda "Şimdi Değil" denmişse kartı kontrol edin.
  - **Beklenen:** Kart soruyu ve sektör çiplerini gösterir.

### Madde 2: Akıllı araç bulucu

**Müşteri**
- [ ] Bulucuyu açın: ana sayfada 2. kısayol **"Araç bulucu"** ya da sektör kartındaki **"Araç Bulucu: 4 soruda…"**.
- [ ] **1/4 Kullanım:** sektör seçin.
  - **Beklenen:** Ana sayfada seçili sektör ön seçili gelir.
- [ ] **2/4 Yük:** seçmeden **Devam**'a basmayı deneyin.
  - **Beklenen:** Devam pasif. Ardından Orta yük seçin.
- [ ] **3/4 Bütçe:** **Kredili / taksitli** → aylık tutar ve peşinat girin.
  - **Beklenen:** "En yüksek araç fiyatı" hesaplanır.
- [ ] **4/4 Özet:** kullanım, yük ve bütçe satırlarını kontrol edin → **"N ilanı göster"**.
  - **Beklenen:** Sonuçta kategori ve alt tür çipleri (ör. Kamyon · Damperli) ve fiyat sınırı.
- [ ] Bütçeyi çok düşük girin (ör. peşin `50.000`).
  - **Beklenen:** Özette "Bu bütçede uygun ilan yok" ve **"Bütçesiz göster"** düğmesi.
- [ ] **Geri** ile adımlar arasında dönün.
  - **Beklenen:** Cevaplar korunur.

### Madde 24: Toplam sahip olma maliyeti

**Yönetici (önce ayarlar)**
- [ ] Profil → **Finansman Ayarları** → **"Maliyet varsayılanları"**.
- [ ] Motorin fiyatı, kategoriye göre tüketim, bakım ve lastik (TL/km), sigorta ve vergi (TL/yıl) değerlerini kontrol edip güncelleyin → Kaydet.

**Müşteri**
- [ ] Bir kamyon/çekici ilanı açın → "Aylık ödeme hesapla" bölümünde **"Toplam sahip olma maliyetini hesapla"**.
- [ ] Tüketim alanını kontrol edin.
  - **Beklenen:** İlanın kategorisine göre dolu gelir.
- [ ] Yıllık km çiplerini (50.000 – 200.000) deneyin.
  - **Beklenen:** Aylık ve yıllık maliyet ile yakıt, bakım, lastik kalemleri değişir.
- [ ] Sonucu elle kontrol edin: 100.000 km, 32 L/100 km, motorin 55 TL.
  - **Beklenen:** Yakıt yıllık **1.760.000 TL**.
- [ ] **Kredili**'ye geçin.
  - **Beklenen:** "Kredi taksitleri (ilk yıl)" satırı eklenir; altta peşinat ve vade açıklaması.

---

## Adım 5: İletişim, randevu ve bildirimler

### Madde 27: Sabit telefon araması kaydı

**Müşteri**
- [ ] Bir ilan detayında **Hemen Ara**'ya basın.
  - **Beklenen:** Telefon uygulaması açılır. Aramayı yapmadan geri dönebilirsiniz; kayıt dokunuşta düşer.
- [ ] Ana sayfanın en altındaki "Aradığını bulamadın mı?" kartında **Hemen Ara**'ya basın.
  - **Beklenen:** Bu dokunuş genel arama olarak kaydedilir.

**Yönetici**
- [ ] Aynı ilanı açın → "Yönetici: araç bilgileri" bölümünü kontrol edin.
  - **Beklenen:** **"Hemen Ara: toplam N · son 30 gün M"**; sayı arttı.
- [ ] Profil → **Arama Kayıtları** → üstteki sayıları kontrol edin.
  - **Beklenen:** Bugün / Son 7 gün / Toplam.
- [ ] Listeyi kontrol edin.
  - **Beklenen:** Müşteri adı, ilan başlığı (ana sayfadan aramada "Genel arama"), tarih-saat.
- [ ] İlan başlığına dokunun → ilan açılır.
- [ ] Yeşil telefon düğmesine dokunun (müşterinin profilinde telefon varsa görünür) → müşteri aranır.

### Madde 31: Randevu yönetimi (Madde 14, 15 dahil)

**Müşteri**
- [ ] Bir ilandan **Beni Arayın** → konu **Yerinde inceleme randevusu** → gün ve saat aralığı seçip gönderin.

**Yönetici**
- [ ] Talep detayında **Randevu** kartını kontrol edin.
  - **Beklenen:** "Müşterinin tercihi: …"; gün ve saat çipleri müşterinin tercihine göre ön seçili.
- [ ] Gün ve saat (ör. yarın 14:00) seçin → **Randevu Oluştur**.
  - **Beklenen:** Durum otomatik **Görüşülüyor** olur; başlıkta yeşil "Randevu: Yarın, 14:00".
- [ ] Profil → **Randevular** → randevu "Yarın" başlığı altında görünür (saat, müşteri, konu, ilan, danışman); dokununca talep açılır.
- [ ] Randevuyu başka saate alın (**Randevuyu Güncelle**), sonra **Randevuyu Kaldır**'ı deneyin.

**Müşteri (kontrol)**
- [ ] Randevu oluşturulunca bildirim gelir: **"Randevunuz oluşturuldu · Yerinde inceleme · GG.AA.YYYY 14:00"**.
- [ ] Randevu kaldırılınca bildirim gelir: "… randevunuz iptal edildi".
- [ ] Taleplerim listesinde ve talep detayında **"Randevu: Yarın, 14:00"** görünür.

**Hatırlatma**
- [ ] Önümüzdeki 24 saat içinde bir randevu oluşturun (ör. bugün, 2 saat sonrası).
  - **Beklenen:** En geç 15 dakika içinde müşteriye **"Randevu hatırlatması"**, yöneticilere **"Yaklaşan randevu: *Müşteri*"** bildirimi gelir. Aynı randevu için hatırlatma bir kez gider; randevu saati değiştirilirse yeniden gider.

### Madde 6: Telefona bildirim (push) ve benzer araç

**Telefona bildirim**

Ön koşullar:
- Bildirim izni verilmiş olmalı (tanıtımda "Bildirimlere İzin Ver" ya da telefon ayarları).
- **iPhone / TestFlight:** APNs kurulumu yapılmadan telefona bildirim **gelmez** (bkz. "Bilinen sınırlar").
- **Android / Expo Go:** Expo Go Android'de push'u desteklemez.

Kurulum tamamlandıktan sonra:
- [ ] Müşteri telefonunu kilitleyin. Yönetici, müşterinin bir talebinin durumunu değiştirsin.
  - **Beklenen:** Kilit ekranına "Talebiniz güncellendi" düşer. Dokununca uygulama ilgili talebi açar.
- [ ] Uygulama açıkken başka bir bildirim tetikleyin.
  - **Beklenen:** Üstte banner çıkar; Bildirimler sekmesindeki sayı artar.
- [ ] Müşteri hesabından **Çıkış Yap**. Yönetici yeni bir güncelleme yapsın.
  - **Beklenen:** Bu telefona artık o hesabın bildirimi gelmez.
- [ ] Aynı telefonda yönetici hesabıyla giriş yapın.
  - **Beklenen:** Yönetici bildirimleri bu telefona gelir.

**Benzer araç bildirimi**

Ön koşullar:
- Uygulamada yeni ilan ekleme ekranı yoktur. Bu bildirim, bir ilan **yayına girdiğinde** tetiklenir.
- Test için ilanın durumu Supabase panelinden değiştirilir; bunu geliştirici ya da panel erişimi olan kişi yapar.
- Durum değişikliği, o ilanı favorileyen kullanıcılara "İlan durumu değişti" bildirimi de gönderir.

Adımlar:
- [ ] **Müşteri:** Bildirim Tercihleri'nde **"Yeni ilanlar"** açık olmalı ("…ve favorilerinize benzer ilanlar").
- [ ] **Müşteri:** Bir ilanı favorilere ekleyin (ör. Damperli kamyon, 2.000.000 TL).
- [ ] **Panel:** Aynı kategori ve alt türde, fiyatı ±%15 içinde başka bir ilanın durumunu `unpublished` → `published` yapın.
- [ ] **Müşteri:** Bildirimi kontrol edin.
  - **Beklenen:** **"Beğendiğiniz araca benzer yeni ilan"** (ilan başlığı). Dokununca ilan açılır.
- [ ] **Panel:** Aynı gün ikinci bir benzer ilanı yayına alın.
  - **Beklenen:** Aynı kullanıcıya ikinci benzer araç bildirimi **gitmez** (günde en fazla bir).
- [ ] **Müşteri:** "Yeni ilanlar" tercihini kapatıp tekrar deneyin.
  - **Beklenen:** Bildirim gelmez.

**Fiyat / durum bildirimi (telefona)**
- [ ] Favorideki bir ilanın fiyatı panelden değiştirildiğinde bildirim gelir: "Fiyat güncellendi: *ilan*" (uygulama içinde eski → yeni fiyat; telefonda "Yeni fiyat: … TL").

---

## Adım 6 — Talep altyapısı üzerine "Sonraki" maddeleri

### Madde 26 — Sigorta / kasko talebi
**Müşteri**
- [ ] Bir ilanda **Beni Arayın** → konu **"Sigorta / kasko teklifi"** → gönder. **Beklenen:** "Talebiniz alındı · Danışmanınız … sizi arayacaktır".

**Yönetici**
- [ ] Bildirim: "Yeni talep: … · Sigorta / kasko · *ilan*". Talepler listesinde kalkan simgeli "Sigorta / kasko" talebi.

### Madde 44 — Toplu (filo) teklif
**Müşteri**
- [ ] 2 veya 3 ilanı karşılaştırmaya ekleyin → **Karşılaştır** ekranının altında **"N araç için toplu teklif iste"**. **Beklenen:** Tek ilan varken bu düğme görünmez.
- [ ] Düğmeye basın → başlık **"Toplu Teklif"**, "N araç için toplu teklif" altında araçların fotoğraf ve fiyatları; konu seçimi görünmez. Gün/saat, telefon seçip gönderin.

**Yönetici**
- [ ] Talep detayında **"Toplu teklif istenen araçlar (N)"** kartı: araçlar ve "talep anındaki fiyat". Bir araca dokunun → ilan açılır.

### Madde 33 — Araç rezervasyonu
**Müşteri**
- [ ] Yayındaki bir ilanda "Sizi arayalım" bölümünde **Rezerve Et** → başlık **"Rezervasyon"**, konu "Aracı rezerve etmek istiyorum" seçili → gönderin. **Beklenen:** Satılmış veya zaten rezerve ilanda "Rezerve Et" görünmez.

**Yönetici**
- [ ] Talep detayında **Rezervasyon** kartı: **3 gün** seçip **Rezervasyonu Onayla**. **Beklenen:** Başlıkta "Araç … tarihine kadar bu müşteri için rezerve"; durum "Görüşülüyor".
- [ ] İlanı açın → durum rozeti **Rezerve**, altında "… tarihine kadar rezerve".
- [ ] Müşteri tarafında aynı ilan için ikinci bir rezervasyon talebi oluşturun (ilan rezerve olduğundan "Rezerve Et" görünmez: **Beni Arayın** → konu "Aracı rezerve etmek istiyorum") ve yönetici olarak onaylamayı deneyin. **Beklenen:** "Bu ilan başka bir talep için zaten rezerve." uyarısı — ilan iki kez rezerve edilemez.
- [ ] İlk talepte **Rezervasyonu Kaldır**. **Beklenen:** İlan yeniden "Yayında".

**Müşteri (kontrol)**
- [ ] Onayda **"Rezervasyonunuz onaylandı · … tarihine kadar sizin için ayrıldı"**; kaldırılınca **"Rezervasyon sona erdi · … · rezervasyon kaldırıldı"**.
- [ ] Talep detayında yeşil "Araç … tarihine kadar sizin için rezerve" (rezervasyon sürerken).

**Otomatik bitiş**
- [ ] 1 günlük rezervasyon onaylayın; süre dolduktan sonra en geç 15 dakika içinde ilan otomatik "Yayında" olur, müşteriye "Rezervasyon sona erdi · süre doldu", yöneticilere "Rezervasyon süresi doldu" bildirimi gelir. (Hızlı test için süre veritabanından geriye alınabilir — geliştiriciye iletin.)

### Madde 16 — Gerekli belgeler
**Müşteri**
- [ ] İlan detayında "Sizi arayalım" bölümünün altındaki **"Satın alma için gerekli belgeler"** → **Gerekli Belgeler** ekranı.
- [ ] **Bireysel alım / Kurumsal alım** sekmeleri arasında geçin. **Beklenen:** 4 adımlı belge listeleri değişir; altta bilgilendirme notu.

---

## Adım 7 — Takas ve araç alım süreci

> Galeriden fotoğraf seçimi yeni bir yerel modül kullanır: **Expo Go önizlemesinde** hemen, **TestFlight'ta build 4 ve sonrasında** çalışır.

### Madde 35, 36 — Takas başvurusu ve fotoğraf/video
**Müşteri**
- [ ] Bir ilan aç → "Sizi arayalım" bölümünde **"Aracımı takasa vermek istiyorum"** → **Takas / Aracımı Sat** formu; "Takas" seçili, üstte "Almak istediğiniz araç" kartında ilan görünür.
- [ ] Hiçbir şey doldurmadan **Başvuruyu Gönder** → "Aracın markasını girin", "Değerlendirme için en az bir fotoğraf ekleyin" uyarıları.
- [ ] Kategori **Çekici**, marka, model, yıl (`1900` deneyin → "Geçerli bir model yılı girin"), kilometre (binlik ayraçla biçimlenir), hasar durumu, beklenen fiyat girin.
- [ ] **Dış görünüm → Ekle**: galeri açılır (ilk seferde galeri izni istenir); 2 fotoğraf seçin → küçük resimler görünür; birini **×** ile kaldırın. **Motor → Ekle**: kısa bir video seçin → oynat simgeli küçük resim.
- [ ] Gönderin → "Dosyalar yükleniyor (n/N)…" → **"Başvurunuz alındı · Danışmanınız … ön değerlendirmeyi iletecek"** → **Başvurumu Gör**: talep detayında "Müşterinin aracı" bilgileri ve fotoğraf/videolar.

**Yönetici**
- [ ] Bildirim: "Yeni talep: … · Takas · *ilan*". Profil → **Takas ve Alım Talepleri** → talep listede (genel Talepler'de de var).
- [ ] Talep detayı: **Müşterinin aracı** kartı, **Fotoğraf ve videolar** bölümlere göre; bir fotoğrafa dokunun → tarayıcıda açılır; videoya dokunun → oynatılır.

### Madde 37, 38 — Ön değerlendirme ve takas farkı
**Yönetici**
- [ ] **Ön değerlendirme** kartında en az `2.100.000`, en çok `2.300.000` → **Değerlendirmeyi Gönder**. En azı en çoktan büyük girerseniz hata uyarısı.

**Müşteri**
- [ ] Bildirim: **"Aracınızın ön değerlendirmesi hazır · Marka Model · 2.100.000 TL – 2.300.000 TL"**; dokununca talep açılır.
- [ ] Talep detayında yeşil değer aralığı ve **"Ödenecek fark: (ilan fiyatı − 2.300.000) – (ilan fiyatı − 2.100.000) TL"**, altında **"Farkın aylık taksiti (N ay, peşinatsız)"**. Örnek: 6.450.000 TL'lik ilanda fark 4.150.000 – 4.350.000 TL.

### Madde 39 — Takas aracı ekspertiz randevusu
**Yönetici**
- [ ] Talep detayındaki **Randevu** kartında gün/saat + **Firmamızda** yerini seçip **Randevu Oluştur**. Sonra yeri **Ekspertiz merkezinde** yapıp **Randevuyu Güncelle**.

**Müşteri**
- [ ] Bildirimler: "Randevunuz oluşturuldu · Takas · GG.AA.YYYY SS:DD · Firmamızda", ardından "Randevunuz güncellendi · … · Ekspertiz merkezinde". Talep detayında "Randevu: … · Ekspertiz merkezinde".

### Madde 40 — Araç satın alma talebi
**Müşteri**
- [ ] Profil → **Aracımı Sat / Takasla** → "Sadece aracımı satmak" seçili gelir (ilan kartı yok) → bilgileri ve en az bir fotoğrafı ekleyip gönderin.

**Yönetici**
- [ ] Profil → **Takas ve Alım Talepleri**: talep "Araç satış" konusuyla görünür; ön değerlendirme girilebilir (takas farkı bölümü gösterilmez).

---

## Adım 8 — Belgeler

> PDF seçme ve PDF üretme yeni yerel modüller kullanır: **Expo Go önizlemesinde** hemen, **TestFlight'ta build 5 ve sonrasında** çalışır.

### Madde 9, 10 — Araç sağlık kartı ve ekspertiz raporu
**Yönetici**
- [ ] Bir ilan → **Bilgileri Düzenle** → **Araç sağlık kartı**: ekspertiz özeti, mekanik durum, lastik `70`, muayene geçerlilik (önce `31.13.2026` deneyin → "GG.AA.YYYY biçiminde girin"), bilinen kusurlar (2 satır).
- [ ] **Ekspertiz raporu → PDF Seç**: telefondan bir PDF seçin → dosya adı görünür → **Kaydet**.

**Müşteri**
- [ ] İlanda **"Araç Sağlık Kartı"**: ekspertiz, mekanik durum, "Lastikler · %70" ve çubuk, "Muayene geçerli: GG.AA.YYYY", turuncu "Bilinen kusurlar".
- [ ] **Ekspertiz Raporunu Aç** → PDF uygulama içi tarayıcıda açılır.
- [ ] Yönetici muayene tarihini geçmiş bir tarih yapınca: kırmızı **"Muayene süresi doldu"**. Lastik `20` yapınca çubuk turuncu.

### Madde 52 — Belge arşivi
**Yönetici**
- [ ] Bir müşteri talebinin detayında **Belgeler** kartı → **Dosya Seç (PDF / görsel)** → tür **Ekspertiz**, belge adı → **Müşteriye Gönder**. Belge karta eklenir.
- [ ] Belgedeki çöp kutusu → onay → belge kalkar.

**Müşteri**
- [ ] Bildirim: **"Yeni belge eklendi · *ad* · Profil → Belgelerim"**.
- [ ] Profil → **Belgelerim**: belge türü etiketi ve tarihiyle listelenir; dokununca açılır. Belge yokken "Henüz belgeniz yok".
- [ ] Talep detayında "Belgeler" kartında da görünür (müşteride yükleme düğmeleri yok).

### Madde 32 — PDF teklif
**Yönetici**
- [ ] Talep detayı → Belgeler → **Teklif Oluştur (PDF)** → araç ve liste fiyatı görünür.
- [ ] Teklif tutarını ilan fiyatından 150.000 TL düşük girin → "İndirim: 150.000 TL".
- [ ] **Kredili** → peşinat ve vade seçin → aylık taksit kutusu güncellenir. Geçerlilik **7 gün**, not yazın → **PDF Oluştur ve Gönder** → talep detayına dönülür, Belgeler'de "Teklif · …".
- [ ] Toplu teklif talebinde (Madde 44) teklif ekranında tüm araçlar listelenir ve toplam alınır.

**Müşteri**
- [ ] Bildirim: **"Teklifiniz hazır"**. Belgelerim'de "Teklif" etiketli belge → açınca PDF: firma başlığı, teklif no, tarih/geçerlilik, müşteri adı ve telefon, danışman, araç ve fiyat, indirim, **teklif tutarı**, ödeme planı tablosu, not. Türkçe karakterler doğru görünmeli.

---

## Bilinen sınırlar / dikkat edilecekler

- **iOS'ta telefona bildirim:** Apple Developer hesabında APNs anahtarı (.p8) oluşturulup Expo'ya yüklenmeli, uygulama kimliğinde Push Notifications yeteneği açılmalı ve yeni TestFlight build'i alınmalı. O zamana kadar bildirimler yalnızca uygulama içinde (Bildirimler sekmesi) görünür.
- **Teknik bilgiler (Madde 3):** sahibinden'den aktarılan 94 ilanda tonaj, motor gücü ve kabin bilgisi yok. Yönetici girdikçe filtreler çalışır.
- **Varsayılan değerler tahminidir:**
  - Faiz %2,99, en düşük peşinat %30.
  - Motorin 55 TL; tüketim kamyon 28, çekici 32, ticari 11 L/100 km.
  - Bakım 2,5 TL/km, lastik 1,2 TL/km.
  - Sigorta 75.000 TL/yıl, vergi 25.000 TL/yıl.
  - Firmanın gerçek değerleri Finansman Ayarları'ndan girilmeli.
- **Danışmanlar** başlangıçta örnek isimlerdir (Ahmet Yılmaz, Mehmet Kaya, Ayşe Demir). Profil → Danışmanlar'dan gerçek ekiple değiştirilmeli.
- **Karşılaştırma listesi ve sektör seçimi** cihazda tutulur: başka telefonda ya da uygulama silinip yüklenince sıfırlanır.
- Hata bulursanız not alırken **madde numarasını**, **hesap türünü** (müşteri/yönetici), **adımı** ve mümkünse **ekran görüntüsünü** ekleyin.
