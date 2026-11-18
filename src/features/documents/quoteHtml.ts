/**
 * Madde 32: PDF teklif şablonu (expo-print ile PDF'e çevrilir). Tek sayfa A4; firma başlığı, müşteri, araç(lar), fiyat, ödeme planı, geçerlilik
 * ve danışman. Metinler HTML'e kaçışlanır. Görsel gömülmez (iOS yerel dosya adreslerini PDF'e basamaz).
 */
export type QuoteVehicle = { readonly title: string; readonly listingNumber: string; readonly priceText: string };

export type QuoteData = {
  readonly quoteNo: string;
  readonly dateText: string;
  readonly validUntilText: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly advisorName: string;
  readonly vehicles: readonly QuoteVehicle[];
  readonly listTotalText: string;
  readonly discountText: string | null;
  readonly offerTotalText: string;
  /** Ödeme planı satırları (ör. ["Peşinat", "900.000 TL"]); peşin teklifte boş. */
  readonly planRows: readonly (readonly [string, string])[];
  readonly note: string | null;
  readonly companyPhone: string;
};

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function quoteHtml(q: QuoteData): string {
  const vehicleRows = q.vehicles
    .map((v) => `<tr><td>${escape(v.title)}<div class="muted">İlan no: ${escape(v.listingNumber)}</div></td><td class="num">${escape(v.priceText)}</td></tr>`)
    .join('');
  const planRows = q.planRows.map(([label, value]) => `<tr><td>${escape(label)}</td><td class="num">${escape(value)}</td></tr>`).join('');
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.45; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0A213F; padding-bottom: 10px; }
  .brand { font-size: 20px; font-weight: 800; color: #0A213F; }
  .brand small { display: block; font-size: 11px; font-weight: 600; color: #18A749; letter-spacing: .04em; }
  .meta { text-align: right; font-size: 11px; color: #5F6B7A; }
  .meta b { color: #111827; }
  h2 { font-size: 13px; color: #0A213F; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .05em; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 7px 8px; border-bottom: 1px solid #E4E7EC; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-weight: 600; }
  .muted { color: #5F6B7A; font-size: 10.5px; }
  .total td { font-size: 14px; font-weight: 800; color: #0A213F; border-bottom: none; background: #EDF2F9; }
  .discount td { color: #13803B; }
  .box { background: #F2F4F7; border-radius: 8px; padding: 10px 12px; }
  .foot { margin-top: 22px; font-size: 10.5px; color: #5F6B7A; border-top: 1px solid #E4E7EC; padding-top: 8px; }
</style></head>
<body>
  <div class="head">
    <div class="brand">Neşeli Otomotiv<small>KAMYON · ÇEKİCİ · DORSE · TİCARİ ARAÇ</small></div>
    <div class="meta">Teklif no: <b>${escape(q.quoteNo)}</b><br/>Tarih: <b>${escape(q.dateText)}</b><br/>Geçerlilik: <b>${escape(q.validUntilText)}</b></div>
  </div>

  <h2>Sayın ${escape(q.customerName)}</h2>
  <div class="muted">Telefon: ${escape(q.customerPhone)} · Danışman: ${escape(q.advisorName)}</div>

  <h2>Araç${q.vehicles.length > 1 ? 'lar' : ''}</h2>
  <table>${vehicleRows}
    ${q.discountText ? `<tr><td>Liste toplamı</td><td class="num">${escape(q.listTotalText)}</td></tr><tr class="discount"><td>İndirim</td><td class="num">− ${escape(q.discountText)}</td></tr>` : ''}
    <tr class="total"><td>Teklif tutarı</td><td class="num">${escape(q.offerTotalText)}</td></tr>
  </table>

  ${planRows ? `<h2>Ödeme planı</h2><table>${planRows}</table><div class="muted">Tahmini plandır; kesin kredi koşullarını banka belirler.</div>` : ''}

  ${q.note ? `<h2>Not</h2><div class="box">${escape(q.note).replace(/\n/g, '<br/>')}</div>` : ''}

  <div class="foot">Bu teklif ${escape(q.validUntilText)} tarihine kadar geçerlidir. Araç durumu teslim öncesi birlikte kontrol edilir.<br/>
  Neşeli Otomotiv · ${escape(q.companyPhone)}</div>
</body></html>`;
}
