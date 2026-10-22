# Neşeli Otomotiv – Mobil Uygulama

Android ve iOS için Neşeli Kamyon Tır Pazarı ilan uygulaması. Expo (SDK 58) + React Native + TypeScript, backend Supabase.
Arayüz `designs/Screens` altındaki ekran tasarımlarına göre kuruludur.

## Özellikler (v1)

- Tanıtım, bildirim ve konum izni ekranları (ilk açılış)
- E-posta/şifre ile giriş, kayıt (e-posta doğrulaması yok, kayıtla birlikte giriş yapılır), şifre sıfırlama bağlantısı (Supabase Auth)
- Ana sayfa, kategoriler, arama sonuçları, filtreleme, sonuç yok durumu
- İlan detayı, fotoğraf ve video galerisi
- Favoriler ve kayıtlı aramalar
- Firma ile ilan bazlı gerçek zamanlı mesajlaşma (Supabase Realtime)
- Uygulama içi bildirimler (sunucu tetikleyicileri), bildirim tercihleri, duyurular
- Profil, profil düzenleme, gizlilik, hesap silme

İlanları yalnızca `admin` rolündeki hesaplar ekler/düzenler (RLS ile korunur). Kullanıcı yalnızca kendi kayıtlarını görür.

## Kurulum

```bash
npm install
cp .env.example .env.local   # Supabase URL ve publishable key'i doldurun
npx expo run:ios             # development build (iOS simülatör)
npx expo start               # sonraki açılışlarda yalnızca Metro
```

Geliştirmede development build (`npx expo run:ios|android`) ya da Expo Go (`npx expo start`, telefonda QR; farklı ağdaysa `--tunnel`) kullanılabilir.
Expo Go'da şifre sıfırlama e-postasındaki `neseliotomotiv://` bağlantısı uygulamayı açmaz (Expo Go `exp://` kullanır); diğer akışlar çalışır.

## Expo Go ile başkalarına gösterme (EAS Update)

Proje Expo'da `neseli-otomotiv` organizasyonundadır (`app.json` → `owner`, `extra.eas.projectId`). Bilgisayar açık olmadan test ettirmek için:

```bash
npx eas-cli@latest login        # neseli-otomotiv organizasyonuna erişimi olan hesap
npm run preview:expo-go         # .env.local'deki Supabase değerleriyle; EXPO_GO_PREVIEW=1 → runtime "exposdk:58.0.0", 'tasarim-onizleme' dalına yayın
```

Yayın bitince expo.dev → proje → Updates → `tasarim-onizleme` dalındaki güncellemenin QR kodu/bağlantısı paylaşılır; test eden kişi
Expo Go (SDK 58) ile açar. Main dalının `preview` kanalı ayrı kalır, bu dal onu ezmez.

Test hesapları (yalnız test edenler için): müşteri `demo.musteri@neseli.test`, yönetici `demo.yonetici@neseli.test` — şifre ayrı iletilir.

## Supabase

Proje: **neseli-app-mui** (`kdydrtqhihamayiigknm`, ap-northeast-1). Şemanın tek doğru kaynağı uzak projedir.

- `supabase/migrations/20261017000000_init.sql` eski iskeletten kalmıştır ve uzak şemayla uyuşmaz; uzak projeye **uygulanmamalıdır**.
- Tipleri uzak şemadan yeniden üretmek için:
  `npx supabase gen types typescript --project-id kdydrtqhihamayiigknm > src/services/supabase/database.types.ts`
- E-posta bağlantıları uygulamaya `neseliotomotiv://verify-email` ve `neseliotomotiv://reset-password` adresleriyle döner.
  Supabase Dashboard → Authentication → URL Configuration → Redirect URLs listesine `neseliotomotiv://**` eklenmelidir.

## Yönetici (firma) hesapları

Yönetici, uygulamaya normal girişle girer; **Mesajlar** sekmesinde tüm müşterilerin konuşmalarını müşteri adıyla görür ve cevaplar.
Müşteri mesaj attığında yöneticilere uygulama içi bildirim düşer; sohbet açılınca okundu sayılır.

Yetki yalnızca veritabanından verilir (uygulamadan kimse kendi rolünü değiştiremez, `profiles_protect_role` tetikleyicisi engeller).
Kişi önce normal kayıt olur, ardından Supabase SQL Editor'de:

```sql
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'kisi@ornek.com');
-- yetkiyi kaldırmak için role = 'user'
```

## Mimari

```
src/
  app/                 Expo Router rotaları (yalnızca ekranı bağlar)
  features/            Ekranlar ve hook'lar (auth, listings, messaging, notifications, profile, saved, onboarding…)
  ui/                  Tasarım sistemi (main dalındaki tasarımdan: tema, Text, Button, Icon, ListingCard, TabBar, PhotoWall, ana sayfa parçaları)
  domain/              Tipler ve saf iş kuralları (filtre, biçimlendirme, doğrulama)
  services/
    contracts.ts       UI'nın bağlı olduğu servis sözleşmeleri
    supabase/          Supabase adapter'ı (istemci, eşlemeler, servisler, üretilmiş tipler)
  bootstrap/           Açılış (oturum okuma) ve kök sağlayıcılar
  permissions/ media/  İzin ve video yardımcıları
plugins/               Yerel config plugin'leri
designs/Screens/       Ekran tasarımları
```

UI yalnızca `services/contracts.ts`'e bağımlıdır; veri erişimi `services/supabase/` içindedir.

## Komutlar

```bash
npx tsc --noEmit     # tip kontrolü
npx expo lint        # lint
npx expo-doctor      # bağımlılık / yapılandırma kontrolü
npx eas-cli@latest build --platform all   # mağaza derlemesi (EAS)
```
