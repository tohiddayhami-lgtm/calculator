import type { ExhibitionEvent, ExhibitionReservation } from './types';
import { boothCode, normalizeExhibitionEvent } from './exhibitionNormalize';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function normalizeUrl(raw: string | undefined): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

function reservationSearchText(reservation: ExhibitionReservation): string {
  return [
    reservation.companyName,
    reservation.contactName,
    reservation.city,
    reservation.products,
    reservation.phone,
  ].join(' ');
}

export function buildExhibitionOnlineHtml(rawEvent: ExhibitionEvent): string {
  const event = normalizeExhibitionEvent(rawEvent);
  const totalBooths = event.categories.reduce((sum, c) => sum + c.boothCount, 0);
  const confirmed = event.reservations.filter(r => r.reservationStatus === 'confirmed').length;
  const reserved = event.reservations.length - confirmed;
  const pct = totalBooths ? Math.round((event.reservations.length / totalBooths) * 100) : 0;
  const background = event.storyBackgroundUrl?.trim()
    ? `background-image:linear-gradient(135deg,rgba(2,6,23,.88),rgba(49,46,129,.72),rgba(15,118,110,.78)),url('${escapeAttr(event.storyBackgroundUrl)}');`
    : '';

  const boothIndex = new Map<string, ExhibitionReservation>();
  event.reservations.forEach(r => boothIndex.set(`${r.categoryId}:${r.boothNumber}`, r));

  const categoryButtons = event.categories
    .map((c, index) => {
      const active = index === 0 ? ' active' : '';
      const count = event.reservations.filter(r => r.categoryId === c.id).length;
      return `<button class="hall-pill${active}" data-filter="${escapeAttr(c.id)}" style="--hall:${escapeAttr(c.color)}"><span>${escapeHtml(c.name)}</span><b>${count}/${c.boothCount}</b></button>`;
    })
    .join('');

  const floorMaps = event.categories
    .map(c => {
      const cells = Array.from({ length: c.boothCount }, (_, i) => {
        const n = i + 1;
        const reservation = boothIndex.get(`${c.id}:${n}`);
        const code = boothCode(c, n);
        if (!reservation) {
          return `<span class="booth-cell empty" title="${escapeAttr(code)}">${escapeHtml(String(n))}</span>`;
        }
        const href = normalizeUrl(reservation.storeUrl);
        const content = `<strong>${escapeHtml(code)}</strong><small>${escapeHtml(reservation.companyName)}</small>`;
        const cls = `booth-cell booked ${reservation.reservationStatus === 'reserved' ? 'reserved' : 'confirmed'}`;
        return href
          ? `<a class="${cls}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(`${code} - ${reservation.companyName}`)}">${content}</a>`
          : `<span class="${cls}" title="${escapeAttr(`${code} - ${reservation.companyName}`)}">${content}</span>`;
      }).join('');
      return `<section class="hall-map" data-hall="${escapeAttr(c.id)}" style="--hall:${escapeAttr(c.color)}">
        <div class="hall-head">
          <div>
            <p>Hall / Category</p>
            <h2>${escapeHtml(c.name)}</h2>
            ${c.description ? `<span>${escapeHtml(c.description)}</span>` : ''}
          </div>
          <b>${event.reservations.filter(r => r.categoryId === c.id).length}/${c.boothCount}</b>
        </div>
        <div class="floor-grid">${cells}</div>
      </section>`;
    })
    .join('');

  const cards = event.reservations
    .map(r => {
      const category = event.categories.find(c => c.id === r.categoryId);
      if (!category) return '';
      const code = boothCode(category, r.boothNumber);
      const href = normalizeUrl(r.storeUrl);
      return `<article class="company-card" data-hall="${escapeAttr(category.id)}" data-search="${escapeAttr(reservationSearchText(r).toLowerCase())}" style="--hall:${escapeAttr(category.color)}">
        <div class="card-glow"></div>
        <div class="card-top">
          <span class="booth-code">${escapeHtml(code)}</span>
          <span class="status ${r.reservationStatus === 'reserved' ? 'reserved' : 'confirmed'}">${r.reservationStatus === 'reserved' ? 'Reserved' : 'Confirmed'}</span>
        </div>
        <h3>${escapeHtml(r.companyName)}</h3>
        <p class="category">${escapeHtml(category.name)}${r.city ? ` · ${escapeHtml(r.city)}` : ''}</p>
        ${r.products ? `<p class="products">${escapeHtml(r.products)}</p>` : '<p class="products muted">No product description yet.</p>'}
        <div class="card-meta">
          ${r.contactName ? `<span>${escapeHtml(r.contactName)}</span>` : ''}
          ${r.phone ? `<span dir="ltr">${escapeHtml(r.phone)}</span>` : ''}
        </div>
        ${href
          ? `<a class="shop-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">Enter Store <span>↗</span></a>`
          : `<span class="shop-link disabled">Store link coming soon</span>`}
      </article>`;
    })
    .join('');

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(event.title || 'Exhibition')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{color-scheme:dark;--bg:#020617;--panel:rgba(15,23,42,.72);--line:rgba(255,255,255,.14);--muted:#94a3b8;--text:#f8fafc;--violet:#8b5cf6;--cyan:#22d3ee;--green:#34d399;--orange:#fb923c}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Vazirmatn,Tahoma,sans-serif;background:radial-gradient(circle at 10% 5%,rgba(34,211,238,.2),transparent 32%),radial-gradient(circle at 82% 0,rgba(139,92,246,.28),transparent 34%),linear-gradient(135deg,#020617,#111827 48%,#0f172a);color:var(--text)}
a{color:inherit}.page{min-height:100vh}.hero{position:relative;overflow:hidden;padding:40px 18px 30px;background-size:cover;background-position:center;${background}}.hero:before{content:"";position:absolute;inset:auto -10% -26% -10%;height:260px;background:linear-gradient(90deg,rgba(34,211,238,.24),rgba(139,92,246,.26),rgba(52,211,153,.16));filter:blur(42px)}.wrap{position:relative;width:min(1180px,100%);margin:0 auto}
.badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(196,181,253,.35);background:rgba(88,28,135,.35);color:#ddd6fe;border-radius:999px;padding:8px 14px;font-weight:800;font-size:13px;backdrop-filter:blur(14px)}
.hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:22px;align-items:end;margin-top:28px}.title h1{font-size:clamp(34px,6vw,78px);line-height:1.05;margin:0;font-weight:900;letter-spacing:-.06em}.title p{max-width:760px;color:#cbd5e1;font-size:clamp(15px,2.4vw,22px);line-height:1.9;margin:18px 0 0}.meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.meta span{border:1px solid var(--line);background:rgba(15,23,42,.56);border-radius:16px;padding:10px 13px;color:#e2e8f0;font-size:13px}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.stat{border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.06));border-radius:26px;padding:20px;backdrop-filter:blur(20px);box-shadow:0 22px 70px rgba(0,0,0,.18)}.stat b{display:block;font-size:36px;line-height:1;color:#fff}.stat span{display:block;margin-top:9px;color:#cbd5e1;font-size:13px}.progress{grid-column:1/-1;height:12px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.progress i{display:block;height:100%;width:${Math.min(100, pct)}%;background:linear-gradient(90deg,var(--green),var(--cyan),var(--violet));border-radius:inherit}
.controls{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--line);background:rgba(2,6,23,.76);backdrop-filter:blur(18px)}.controls-inner{width:min(1180px,100%);margin:0 auto;padding:14px 18px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}.search{width:100%;border:1px solid var(--line);background:rgba(15,23,42,.7);color:#fff;border-radius:18px;padding:13px 16px;font-family:inherit;outline:none}.search:focus{border-color:rgba(34,211,238,.62);box-shadow:0 0 0 4px rgba(34,211,238,.1)}
.hall-pills{display:flex;gap:8px;overflow:auto;padding-bottom:2px}.hall-pill{white-space:nowrap;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#cbd5e1;border-radius:999px;padding:10px 13px;font-family:inherit;font-weight:800;cursor:pointer}.hall-pill b{margin-right:8px;color:var(--hall)}.hall-pill.active{background:linear-gradient(135deg,var(--hall),rgba(255,255,255,.16));color:#fff;border-color:rgba(255,255,255,.32)}
.section{width:min(1180px,100%);margin:0 auto;padding:28px 18px}.section-title{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:16px}.section-title h2{margin:0;font-size:28px}.section-title p{margin:6px 0 0;color:var(--muted);font-size:14px}
.hall-map{border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.045));border-radius:30px;padding:18px;margin-bottom:18px;box-shadow:0 24px 80px rgba(0,0,0,.18)}.hall-head{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:14px;margin-bottom:16px}.hall-head p{margin:0;color:var(--hall);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.hall-head h2{margin:4px 0 0;font-size:24px}.hall-head span{display:block;color:var(--muted);font-size:13px;margin-top:4px}.hall-head b{font-size:26px;color:#fff}
.floor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:9px}.booth-cell{min-height:66px;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;text-decoration:none;padding:7px;border:1px solid rgba(255,255,255,.12);transition:.18s ease}.booth-cell strong{font-size:12px}.booth-cell small{font-size:10px;line-height:1.35;margin-top:3px;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.booth-cell.empty{color:#64748b;background:rgba(255,255,255,.045)}.booth-cell.booked{color:#fff;background:linear-gradient(135deg,var(--hall),rgba(15,23,42,.52));box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}.booth-cell.confirmed{outline:1px solid rgba(52,211,153,.3)}.booth-cell.reserved{outline:1px solid rgba(251,146,60,.45)}a.booth-cell:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(0,0,0,.24)}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.company-card{position:relative;overflow:hidden;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.11),rgba(255,255,255,.055));border-radius:30px;padding:19px;min-height:260px;box-shadow:0 24px 90px rgba(0,0,0,.2)}.card-glow{position:absolute;inset:-40% auto auto -20%;width:210px;height:210px;background:var(--hall);filter:blur(70px);opacity:.22}.card-top{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px}.booth-code{font-family:ui-monospace,Menlo,monospace;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:7px 10px;font-weight:900;color:#fff}.status{font-size:11px;border-radius:999px;padding:6px 10px;font-weight:900}.status.confirmed{background:rgba(52,211,153,.17);color:#86efac}.status.reserved{background:rgba(251,146,60,.18);color:#fdba74}.company-card h3{position:relative;margin:18px 0 6px;font-size:24px;line-height:1.25}.category{position:relative;margin:0;color:#c4b5fd;font-size:13px}.products{position:relative;color:#cbd5e1;line-height:1.8;font-size:14px;min-height:76px}.muted{color:#64748b}.card-meta{position:relative;display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.card-meta span{font-size:12px;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.46);border-radius:999px;padding:6px 9px;color:#cbd5e1}.shop-link{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border-radius:18px;padding:13px 14px;text-decoration:none;font-weight:900;background:linear-gradient(135deg,var(--hall),#22d3ee);color:#fff;box-shadow:0 15px 35px rgba(34,211,238,.12)}.shop-link.disabled{background:rgba(255,255,255,.08);color:#94a3b8;box-shadow:none}.hidden{display:none!important}.empty-state{border:1px dashed rgba(255,255,255,.2);border-radius:26px;padding:40px;text-align:center;color:#94a3b8}
.footer{padding:28px 18px 44px;text-align:center;color:#64748b;font-size:12px}
@media(max-width:900px){.hero-grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(4,1fr)}.controls-inner{grid-template-columns:1fr}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.hero{padding-top:28px}.stats,.cards{grid-template-columns:1fr}.stat b{font-size:30px}.floor-grid{grid-template-columns:repeat(auto-fit,minmax(58px,1fr))}.booth-cell{min-height:58px;border-radius:15px}.section-title{display:block}}
</style>
</head>
<body>
<main class="page">
  <header class="hero">
    <div class="wrap">
      <span class="badge">✦ Online Exhibition Hall</span>
      <div class="hero-grid">
        <div class="title">
          <h1>${escapeHtml(event.title || 'نمایشگاه آنلاین')}</h1>
          ${event.subtitle ? `<p>${escapeHtml(event.subtitle)}</p>` : ''}
          <div class="meta">
            ${event.location ? `<span>📍 ${escapeHtml(event.location)}</span>` : ''}
            ${event.startDate ? `<span>📅 ${escapeHtml(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ` تا ${escapeHtml(event.endDate)}` : ''}</span>` : ''}
            ${event.organizerName ? `<span>🏛 ${escapeHtml(event.organizerName)}</span>` : ''}
          </div>
        </div>
        <div class="stats">
          <div class="stat"><b>${totalBooths}</b><span>کل غرفه‌ها</span></div>
          <div class="stat"><b>${event.reservations.length}</b><span>غرفه‌های رزروشده</span></div>
          <div class="stat"><b>${confirmed}</b><span>قطعی</span></div>
          <div class="stat"><b>${reserved}</b><span>رزرو موقت</span></div>
          <div class="progress"><i></i></div>
        </div>
      </div>
    </div>
  </header>
  <nav class="controls">
    <div class="controls-inner">
      <input id="search" class="search" type="search" placeholder="جستجوی شرکت، محصول، شهر یا شماره تماس..." />
      <div class="hall-pills">
        <button class="hall-pill active" data-filter="all" style="--hall:#22d3ee"><span>همه غرفه‌ها</span><b>${event.reservations.length}</b></button>
        ${categoryButtons}
      </div>
    </div>
  </nav>
  <section class="section">
    <div class="section-title">
      <div><h2>نقشه سالن نمایشگاه</h2><p>غرفه‌های رزروشده قابل کلیک هستند و در صورت داشتن لینک، به فروشگاه شرکت هدایت می‌شوند.</p></div>
    </div>
    ${floorMaps}
  </section>
  <section class="section">
    <div class="section-title">
      <div><h2>شرکت‌ها و غرفه‌های رزروشده</h2><p>برای ورود به فروشگاه یا کاتالوگ هر شرکت، روی دکمه کارت غرفه کلیک کنید.</p></div>
    </div>
    <div id="cards" class="cards">${cards || '<div class="empty-state">هنوز غرفه رزروشده‌ای برای نمایش وجود ندارد.</div>'}</div>
    <div id="empty" class="empty-state hidden">نتیجه‌ای برای این جستجو پیدا نشد.</div>
  </section>
  <footer class="footer">Generated by Tohid Dayhami Export+ Exhibition</footer>
</main>
<script>
(function(){
  var filter='all';
  var search='';
  var pills=[].slice.call(document.querySelectorAll('.hall-pill'));
  var cards=[].slice.call(document.querySelectorAll('.company-card'));
  var maps=[].slice.call(document.querySelectorAll('.hall-map'));
  var empty=document.getElementById('empty');
  function apply(){
    var visible=0;
    cards.forEach(function(card){
      var hallOk=filter==='all'||card.getAttribute('data-hall')===filter;
      var text=(card.getAttribute('data-search')||'').toLowerCase();
      var searchOk=!search||text.indexOf(search)>-1;
      var show=hallOk&&searchOk;
      card.classList.toggle('hidden',!show);
      if(show) visible++;
    });
    maps.forEach(function(map){ map.classList.toggle('hidden',!(filter==='all'||map.getAttribute('data-hall')===filter)); });
    if(empty) empty.classList.toggle('hidden',visible!==0);
  }
  pills.forEach(function(btn){
    btn.addEventListener('click',function(){
      filter=btn.getAttribute('data-filter')||'all';
      pills.forEach(function(x){x.classList.toggle('active',x===btn);});
      apply();
    });
  });
  var searchInput=document.getElementById('search');
  if(searchInput) searchInput.addEventListener('input',function(){ search=(searchInput.value||'').trim().toLowerCase(); apply(); });
})();
</script>
</body>
</html>`;
}
