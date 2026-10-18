import { Image } from 'expo-image';

// Tasarım görselinden vektöre çevrildi (beyaz, şeffaf zemin).
// Firmanın vektörel logosu gelince değiştirilecek.
const source = require('@/assets/images/logo-navy.png');
const markSource = require('@/assets/images/logo-mark-navy.png');

/** Lacivert daire içinde amblem (sohbet başlığı) */
export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={markSource}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      accessibilityLabel="Neşeli Otomotiv"
    />
  );
}

export function Logo({ height = 44 }: { height?: number }) {
  return (
    <Image
      source={source}
      style={{ height, aspectRatio: 840 / 213 }}
      contentFit="contain"
      accessibilityLabel="Neşeli Kamyon Tır Pazarı"
    />
  );
}
