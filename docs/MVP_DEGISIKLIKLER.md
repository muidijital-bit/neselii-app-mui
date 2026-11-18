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

## Sıradaki adımlar
- **Adım 4:** Madde 3 (ticari filtreler), 4 (karşılaştırma), 1 (sektöre göre başlangıç), 2 (akıllı araç bulucu), 24 (toplam sahip olma maliyeti).
- **Adım 5:** Madde 6 (push + benzer araç bildirimi), 27 (arama kaydı), 31 (randevu yönetimi).
