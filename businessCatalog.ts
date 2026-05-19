import type { BusinessItem, BusinessProfile } from './types';
import { itemTypeLabel, kindLabel, pricingModelLabel } from './businessCore';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(n: number, ccy: string): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${ccy}`;
}

export function buildBusinessCatalogHtml(
  profile: BusinessProfile,
  items: BusinessItem[],
  title?: string,
): string {
  const active = items.filter((i) => i.active);
  const byCat = new Map<string, BusinessItem[]>();
  for (const it of active) {
    const c = it.category || 'عمومی';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(it);
  }

  const sections = [...byCat.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'fa'))
    .map(([cat, list]) => {
      const rows = list
        .map((it) => {
          const cf = Object.entries(it.customFields || {})
            .filter(([, v]) => String(v).trim())
            .map(([k, v]) => `${esc(k)}: ${esc(v)}`)
            .join(' · ');
          return `<tr>
            <td><strong>${esc(it.name)}</strong>${it.sku ? `<div class="muted">SKU ${esc(it.sku)}</div>` : ''}</td>
            <td>${esc(itemTypeLabel(it.itemType))}</td>
            <td>${esc(pricingModelLabel(it.pricingModel))} / ${esc(it.unit)}</td>
            <td class="num">${formatMoney(it.unitPrice, it.currency)}</td>
            <td class="num muted">${it.costPrice > 0 ? formatMoney(it.costPrice, it.currency) : '—'}</td>
            <td class="notes">${cf || esc(it.notes) || '—'}</td>
          </tr>`;
        })
        .join('');
      return `<section class="cat"><h2>${esc(cat)}</h2>
        <table><thead><tr>
          <th>عنوان</th><th>نوع</th><th>مدل قیمت</th><th>قیمت</th><th>هزینه</th><th>جزئیات</th>
        </tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join('');

  const headTitle = esc(title || `کاتالوگ — ${profile.name}`);

  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
<title>${headTitle}</title>
<style>
  body{font-family:Tahoma,Vazirmatn,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px}
  .card{max-width:960px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(15,23,42,.08);padding:28px}
  h1{font-size:22px;margin:0 0 8px}
  .meta{font-size:13px;color:#64748b;margin-bottom:24px;line-height:1.6}
  h2{font-size:16px;color:#1e40af;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:24px 0 12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:right;vertical-align:top}
  th{background:#f1f5f9;font-weight:600}
  .num{white-space:nowrap;font-variant-numeric:tabular-nums}
  .muted{color:#64748b;font-size:12px}
  .notes{font-size:12px;color:#475569;max-width:200px}
  @media print{body{background:#fff;padding:0}.card{box-shadow:none}}
</style></head><body><div class="card">
<h1>${headTitle}</h1>
<p class="meta">${esc(kindLabel(profile.kind))}${profile.description ? ` · ${esc(profile.description)}` : ''}<br/>
${active.length} آیتم فعال · ${new Date().toLocaleDateString('fa-IR')}</p>
${sections || '<p>آیتمی ثبت نشده است.</p>'}
</div></body></html>`;
}
