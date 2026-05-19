import type { BusinessCatalogOptions, BusinessItem, BusinessProfile } from './types';
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

function itemImageUrl(it: BusinessItem): string {
  const u = (it.imageUrl || it.customFields?.imageUrl || '').trim();
  if (!u || !/^https?:\/\//i.test(u)) return '';
  return u;
}

export function buildBusinessCatalogHtml(
  profile: BusinessProfile,
  items: BusinessItem[],
  title?: string,
  options?: BusinessCatalogOptions,
): string {
  const opts = options ?? {};
  const showImages = opts.showImages !== false;
  const showCost = opts.showCostColumn === true;
  const hidePrices = opts.hidePrices === true;

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
          const img = showImages ? itemImageUrl(it) : '';
          const imgCell = img
            ? `<td class="thumb"><img src="${esc(img)}" alt="" loading="lazy"/></td>`
            : showImages
              ? `<td class="thumb muted">—</td>`
              : '';
          const cf = Object.entries(it.customFields || {})
            .filter(([k, v]) => String(v).trim() && k !== 'imageUrl')
            .map(([k, v]) => `${esc(k)}: ${esc(v)}`)
            .join(' · ');
          const priceCell = hidePrices
            ? '—'
            : formatMoney(it.unitPrice, it.currency);
          return `<tr>
            ${imgCell}
            <td><strong>${esc(it.name)}</strong>${it.sku ? `<div class="muted">SKU ${esc(it.sku)}</div>` : ''}</td>
            <td>${esc(itemTypeLabel(it.itemType))}</td>
            <td>${esc(pricingModelLabel(it.pricingModel))} / ${esc(it.unit)}</td>
            <td class="num">${priceCell}</td>
            ${showCost ? `<td class="num muted">${it.costPrice > 0 ? formatMoney(it.costPrice, it.currency) : '—'}</td>` : ''}
            <td class="notes">${cf || esc(it.notes) || '—'}</td>
          </tr>`;
        })
        .join('');
      const imgTh = showImages ? '<th>تصویر</th>' : '';
      const costTh = showCost ? '<th>هزینه</th>' : '';
      return `<section class="cat"><h2>${esc(cat)}</h2>
        <table><thead><tr>
          ${imgTh}<th>عنوان</th><th>نوع</th><th>مدل قیمت</th><th>قیمت</th>${costTh}<th>جزئیات</th>
        </tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join('');

  const headTitle = esc(opts.title || title || `کاتالوگ — ${profile.name}`);
  const subtitle = opts.subtitle ? `<p class="subtitle">${esc(opts.subtitle)}</p>` : '';
  const tagline = opts.tagline ? `<p class="tagline">${esc(opts.tagline)}</p>` : '';
  const footer = opts.footerText
    ? `<footer class="foot">${esc(opts.footerText)}</footer>`
    : '';
  const logo =
    profile.logoUrl && /^https?:\/\//i.test(profile.logoUrl)
      ? `<img class="logo" src="${esc(profile.logoUrl)}" alt=""/>`
      : '';
  const contact = [
    profile.contactPhone,
    profile.contactEmail,
    profile.address,
    profile.website,
  ]
    .filter(Boolean)
    .map((x) => esc(String(x)))
    .join(' · ');

  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
<title>${headTitle}</title>
<style>
  body{font-family:Tahoma,Vazirmatn,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px}
  .card{max-width:1024px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(15,23,42,.08);padding:28px}
  .head{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px}
  .logo{max-height:56px;max-width:140px;object-fit:contain}
  h1{font-size:22px;margin:0 0 4px}
  .subtitle{font-size:14px;color:#475569;margin:0}
  .tagline{font-size:12px;color:#64748b;margin:4px 0 0}
  .meta{font-size:13px;color:#64748b;margin-bottom:8px;line-height:1.6}
  h2{font-size:16px;color:#1e40af;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:24px 0 12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:right;vertical-align:top}
  th{background:#f1f5f9;font-weight:600}
  .num{white-space:nowrap;font-variant-numeric:tabular-nums}
  .muted{color:#64748b;font-size:12px}
  .notes{font-size:12px;color:#475569;max-width:220px}
  .thumb{width:72px}
  .thumb img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0}
  .foot{margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center}
  @media print{body{background:#fff;padding:0}.card{box-shadow:none}}
</style></head><body><div class="card">
<div class="head">${logo}<div>
<h1>${headTitle}</h1>
${subtitle}${tagline}
<p class="meta">${esc(kindLabel(profile.kind))}${profile.description ? ` · ${esc(profile.description)}` : ''}<br/>
${contact ? `${contact}<br/>` : ''}
${active.length} آیتم فعال · ${new Date().toLocaleDateString('fa-IR')}</p>
</div></div>
${sections || '<p>آیتمی ثبت نشده است.</p>'}
${footer}
</div></body></html>`;
}
