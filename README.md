# Neşeli Otomotiv – Mobil Uygulama

Android ve iOS için otomotiv ilan uygulaması. Expo (SDK 58) + React Native + TypeScript, veritabanı Supabase.

## Özellikler (v1)

- İlan listeleme, arama, sonsuz kaydırma, ilan detayı ve fotoğraf galerisi
- E-posta/şifre ile giriş ve kayıt (Supabase Auth)
- Favoriler
- Satıcıyla gerçek zamanlı mesajlaşma (Supabase Realtime)

İlanları yalnızca `admin` rolündeki hesaplar ekler/düzenler (RLS ile korunur).

## Kurulum

```bash
npm install
cp .env.example .env.local   # Supabase URL ve publishable key'i doldurun
npx expo start
```

Telefonda **Expo Go** ile QR kodu okutarak test edebilirsiniz. Simülatör için `i` (iOS) veya `a` (Android).

## Supabase

1. [supabase.com](https://supabase.com) üzerinde yeni proje oluşturun.
2. SQL Editor'de sırasıyla çalıştırın:
   - `supabase/migrations/20261017000000_init.sql` (tablolar, RLS, bildirim tetikleyicileri, realtime, storage bucket)
   - `supabase/seed.sql` (örnek ilanlar ve duyuru)
   - Firma hesabını admin yapmak için, uygulamadan kayıt olduktan sonra:
     `update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<e-posta>');`
3. Project Settings > API'den URL ve publishable key'i `.env.local` dosyasına yazın.

Alternatif olarak Supabase CLI ile: `npx supabase link --project-ref <ref>` ve `npx supabase db push`.

## Klasör yapısı

```
src/
  app/                 Expo Router ekranları
    (tabs)/            İlanlar, Favoriler, Mesajlar, Profil
    (auth)/            Giriş / kayıt (modal)
    listing/[id].tsx   İlan detayı
    chat/[id].tsx      Sohbet
  components/          Ortak bileşenler
  features/            Supabase sorguları (React Query hook'ları)
  lib/                 Supabase istemcisi, formatlayıcılar
  providers/           Auth context
  types/database.ts    Veritabanı tipleri
supabase/              Migration ve seed SQL
```

## Komutlar

```bash
npx tsc --noEmit     # tip kontrolü
npx expo lint        # lint
npx eas-cli@latest build --platform all   # mağaza derlemesi (EAS)
```
