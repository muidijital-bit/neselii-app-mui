const priceFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

export function formatPrice(price: number, currency = 'TRY') {
  const symbol = currency === 'TRY' ? '₺' : currency;
  return `${priceFormatter.format(price)} ${symbol}`;
}

export function formatKm(km: number) {
  return `${priceFormatter.format(km)} km`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export const fuelLabels: Record<string, string> = {
  benzin: 'Benzin',
  dizel: 'Dizel',
  lpg: 'LPG',
  hibrit: 'Hibrit',
  elektrik: 'Elektrik',
};

export const transmissionLabels: Record<string, string> = {
  manuel: 'Manuel',
  otomatik: 'Otomatik',
  yari_otomatik: 'Yarı Otomatik',
};
