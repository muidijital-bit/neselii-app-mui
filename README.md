# Neşeli Otomotiv – Mobil Uygulama

Android ve iOS için Neşeli Kamyon Tır Pazarı ilan uygulaması. Expo (SDK 58) + React Native + TypeScript, backend Supabase.
Arayüz `designs/Screens` altındaki ekran tasarımlarına göre kuruludur.

## Özellikler (v1)

- Tanıtım, bildirim ve konum izni ekranları (ilk açılış)
- E-posta/şifre ile giriş, kayıt, e-posta doğrulama bağlantısı, şifre sıfırlama bağlantısı (Supabase Auth)
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

Uygulama native modüller (svg, konum, bildirim, video) kullandığı için **Expo Go ile değil, development build ile** çalışır.

## Supabase

Proje: **neseli-app-mui** (`kdydrtqhihamayiigknm`, ap-northeast-1). Şemanın tek doğru kaynağı uzak projedir.

- `supabase/migrations/20261017000000_init.sql` eski iskeletten kalmıştır ve uzak şemayla uyuşmaz; uzak projeye **uygulanmamalıdır**.
- Tipleri uzak şemadan yeniden üretmek için:
  `npx supabase gen types typescript --project-id kdydrtqhihamayiigknm > src/services/supabase/database.types.ts`
- E-posta bağlantıları uygulamaya `neseliotomotiv://verify-email` ve `neseliotomotiv://reset-password` adresleriyle döner.
  Supabase Dashboard → Authentication → URL Configuration → Redirect URLs listesine `neseliotomotiv://**` eklenmelidir.

## Mimari

```
src/
  app/                 Expo Router rotaları (yalnızca ekranı bağlar)
  features/            Ekranlar ve hook'lar (auth, listings, messaging, notifications, profile, saved, onboarding…)
  components/          Ortak bileşenler (Btn, Chip, Field, ListingCard, TabBar, ikon ve logo)
  domain/              Tipler ve saf iş kuralları (filtre, biçimlendirme, doğrulama)
  services/
    contracts.ts       UI'nın bağlı olduğu servis sözleşmeleri
    supabase/          Supabase adapter'ı (istemci, eşlemeler, servisler, üretilmiş tipler)
  theme/               Renk, yazı tipi, boşluk token'ları (Montserrat + Inter)
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
