/**
 * Renk token'ları — design/claude-design (AppScreen + bileşenler) kaynak değerleri.
 * Adlar rol bazlıdır; hex değerleri kaynaktan alınmıştır, uydurma değer yoktur.
 */
export const colors = {
  white: '#ffffff',
  black: '#000000',

  // Marka — lacivert
  navy: '#0a2240', // başlıklar, birincil yüzey, aktif sekme
  navyDeep: '#07182b', // koyu durum çubuğu, rozet zemini (fotoğraf üstü)
  navyRaised: '#0e2b4f', // lacivert üstünde yükselti / basılı durum
  blue: '#15406b', // bağlantı, ikincil vurgu
  blueMid: '#3a6da3', // koyu zeminde çizgi / pasif nokta
  blueLight: '#8eb4dc', // koyu zeminde ikincil metin
  bluePale: '#d6e3f0', // koyu zeminde gövde metni
  blueTint: '#eef3f9', // açık mavi zemin, basılı ikincil buton
  blueText: '#1e5288', // "Yeni" rozet metni

  // Marka — yeşil
  green: '#18a84a', // birincil eylem (CTA)
  greenPressed: '#12863b', // CTA basılı, onay metni
  greenBright: '#35bb63', // koyu zeminde etiket / ikon
  greenText: '#0d6b31', // "Yayında" rozet metni
  greenTint: '#d9f4e4', // "Yayında" rozet zemini
  greenSoft: '#eefaf3', // bildirim bilgi kutusu zemini
  greenBorder: '#b6e8ca', // bildirim bilgi kutusu kenarı
  greenTick: '#7ed6a0', // iletildi/okundu işareti (koyu zemin)

  // Vurgu — turuncu (2. aşama: filtre düğmesi, "Öne çıkan", taksit kampanyası)
  orange: '#f97316',
  orangePressed: '#ea580c',
  orangeTint: '#fff1e6', // kampanya kartı zemini
  orangeBorder: '#fbd5b5', // kampanya kartı kenarı

  // Durum
  danger: '#d4183d', // hata, "Satıldı", sayaç rozeti
  warningTint: '#fbeecb', // "Rezerve" rozet zemini
  warningText: '#b88424', // "Rezerve" rozet metni

  // Nötr
  ink: '#11161f', // birincil metin
  inkSoft: '#39434c', // seçilmemiş çip metni
  inkMuted: '#4a555f', // etiket, ikincil metin
  slate: '#5b6770', // ikon / ikincil metin
  slateLight: '#667085', // ipucu metni, meta
  slatePale: '#75828c', // pasif sekme, devre dışı metin
  slateFaint: '#9fadb9', // ikon pasif, yer tutucu
  line: '#d8dee3', // kenarlık
  lineSoft: '#eceff2', // ince ayırıcı, taslak rozet zemini
  surface: '#f2f4f7', // sayfa zemini
  stripe: '#e4e7ec', // fotoğraf yer tutucu şerit rengi
  darkStripeA: '#1d2533', // koyu galeri yer tutucusu
  darkStripeB: '#2c3543',
} as const;

export type ColorToken = keyof typeof colors;

/** Fotoğraf üstü rozet / sayaç gölgesi dahil kaynakta geçen gölgeler. */
export const shadows = {
  /** box-shadow: 0 1px 4px rgba(7,24,43,.18) — yüzen düğmeler */
  floating: {
    shadowColor: '#07182b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  /** box-shadow: 0 1px 3px rgba(7,24,43,.2) */
  subtle: {
    shadowColor: '#07182b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
  },
} as const;
