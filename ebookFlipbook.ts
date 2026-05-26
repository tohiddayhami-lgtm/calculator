export type EbookLanguageKey = 'fa' | 'en' | 'both';
export type EbookAccessMode = 'public' | 'private';
export type EbookDirection = 'rtl' | 'ltr';

export type EbookFlipbookBuildArgs = {
  title: string;
  fileName: string;
  pdfUrl: string;
  shortCode: string;
  language: EbookLanguageKey;
  direction: EbookDirection;
  accessMode: EbookAccessMode;
  passwordHash?: string;
  passwordSalt?: string;
  allowDownload: boolean;
  accentColor: string;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeHex = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#2563eb';
};

export const buildEbookFlipbookHtml = (args: EbookFlipbookBuildArgs): string => {
  const configJson = JSON.stringify({
    title: args.title || 'Ebook Flipbook',
    fileName: args.fileName || 'ebook.pdf',
    pdfUrl: args.pdfUrl,
    shortCode: args.shortCode,
    language: args.language || 'both',
    direction: args.direction || 'rtl',
    accessMode: args.accessMode || 'public',
    passwordHash: args.passwordHash || '',
    passwordSalt: args.passwordSalt || '',
    allowDownload: !!args.allowDownload,
    accentColor: safeHex(args.accentColor),
  }).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="${args.language === 'en' ? 'en' : 'fa'}" dir="${args.direction === 'ltr' ? 'ltr' : 'rtl'}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${escapeHtml(args.title || 'Ebook Flipbook')}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.min.js"></script>
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#0f172a;color:#e5e7eb;font-family:Inter,Vazirmatn,Tahoma,Arial,sans-serif}body{overflow:hidden}.app{height:100dvh;display:grid;grid-template-rows:auto 1fr;background:radial-gradient(circle at 12% 0%,rgba(37,99,235,.28),transparent 32%),linear-gradient(135deg,#020617,#111827 42%,#172554)}.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px max(14px,env(safe-area-inset-left)) 10px max(14px,env(safe-area-inset-left));border-bottom:1px solid rgba(255,255,255,.1);background:rgba(2,6,23,.72);backdrop-filter:blur(20px)}.brand{min-width:0}.brand h1{margin:0;font-size:16px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.brand p{margin:2px 0 0;font-size:11px;color:#94a3b8}.toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.btn,.chip{border:1px solid rgba(255,255,255,.16);background:rgba(15,23,42,.78);color:#f8fafc;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:800;cursor:pointer}.btn:hover{background:rgba(30,41,59,.94)}.btn.primary{background:var(--accent);border-color:transparent}.btn:disabled{opacity:.45;cursor:not-allowed}.chip{cursor:default;color:#cbd5e1}.main{min-height:0;display:grid;grid-template-columns:76px minmax(0,1fr) 320px;gap:12px;padding:12px}.thumbs,.notes{border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.58);border-radius:22px;overflow:hidden;min-height:0}.thumbs{padding:8px;overflow-y:auto}.thumb{display:block;width:100%;margin:0 0 8px;border:2px solid transparent;border-radius:12px;overflow:hidden;background:#fff;cursor:pointer;padding:0}.thumb.active{border-color:var(--accent)}.thumb canvas{width:100%;display:block}.stage-wrap{position:relative;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.1);background:radial-gradient(circle at top,rgba(255,255,255,.09),transparent 34%),rgba(2,6,23,.34);border-radius:28px;overflow:hidden}.book{width:min(100%,1160px);height:min(100%,760px)}.page{background:#fff;color:#111827;box-shadow:0 22px 80px rgba(0,0,0,.28);overflow:hidden}.page canvas{width:100%;height:100%;display:block;background:#fff}.fallback-book{display:flex;align-items:center;justify-content:center;gap:18px;width:100%;height:100%;padding:18px;perspective:1800px}.fallback-page{width:auto;max-width:min(94%,780px);max-height:100%;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.38);overflow:hidden;transform-origin:center center;will-change:transform,opacity}.fallback-page .page{width:100%;height:auto;box-shadow:none;border-radius:18px}.fallback-page .page canvas{display:block;width:100%;height:auto;background:#fff}.fallback-page.turning{animation:nativeFlip .42s cubic-bezier(.22,.8,.22,1)}@keyframes nativeFlip{0%{transform:rotateY(0) translateX(0);opacity:1}45%{transform:rotateY(-24deg) translateX(-18px) scale(.985);opacity:.78;filter:brightness(.88)}100%{transform:rotateY(0) translateX(0);opacity:1}}.edge{position:absolute;top:0;bottom:0;width:18%;border:0;background:transparent;cursor:pointer}.edge.prev{left:0}.edge.next{right:0}.hud{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.12);background:rgba(2,6,23,.72);backdrop-filter:blur(18px);border-radius:999px;padding:7px 9px}.notes{padding:14px;display:flex;flex-direction:column;gap:10px}.notes h2{margin:0;font-size:14px}.notes textarea{flex:1;min-height:170px;resize:none;border:1px solid rgba(148,163,184,.24);border-radius:16px;background:rgba(2,6,23,.52);color:#f8fafc;padding:12px;font:13px/1.6 inherit;outline:none}.search{display:flex;gap:6px}.search input{min-width:0;flex:1;border:1px solid rgba(148,163,184,.24);background:rgba(2,6,23,.52);color:#f8fafc;border-radius:999px;padding:9px 11px;font-size:12px;outline:none}.results{max-height:130px;overflow:auto;display:grid;gap:5px}.result{border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.78);color:#dbeafe;border-radius:12px;padding:7px 9px;text-align:inherit;cursor:pointer;font-size:11px}.loader,.lock{position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#020617,#111827);padding:24px}.card{width:min(440px,100%);border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.86);border-radius:28px;padding:24px;box-shadow:0 24px 90px rgba(0,0,0,.35);text-align:center}.card h2{margin:0 0 8px;font-size:24px}.card p{margin:0 0 16px;color:#94a3b8;font-size:13px;line-height:1.7}.card input{width:100%;border:1px solid rgba(255,255,255,.18);background:#020617;color:#fff;border-radius:16px;padding:12px 14px;outline:none}.card .btn{width:100%;margin-top:10px}.hidden{display:none!important}.progress{height:8px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden}.progress span{display:block;height:100%;width:0;background:var(--accent);transition:width .2s ease}.toast{position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:40;background:rgba(2,6,23,.88);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:9px 13px;font-size:12px;color:#e2e8f0;box-shadow:0 18px 50px rgba(0,0,0,.32)}@media(max-width:900px){body{overflow:auto}.app{height:100dvh}.topbar{align-items:flex-start}.brand h1{font-size:14px}.main{grid-template-columns:1fr;padding:8px;gap:8px}.thumbs{display:none}.notes{position:fixed;inset:auto 8px 8px 8px;z-index:20;max-height:48dvh;transform:translateY(calc(100% - 48px));transition:transform .24s ease}.notes.open{transform:translateY(0)}.stage-wrap{border-radius:20px}.book{height:calc(100dvh - 132px)}.fallback-book{padding:10px}.toolbar{gap:5px}.btn,.chip{padding:7px 9px;font-size:11px}.hud{bottom:8px}.notes textarea{min-height:140px}}@media(max-width:560px){.topbar{display:block}.toolbar{justify-content:flex-start;margin-top:9px}.chip.file{display:none}.book{height:calc(100dvh - 162px)}}
</style>
</head>
<body style="--accent:${safeHex(args.accentColor)}">
<div class="loader" id="loader"><div class="card"><h2 id="loadingTitle">Loading Ebook</h2><p id="loadingText">Rendering pages...</p><div class="progress"><span id="progress"></span></div></div></div>
<div class="lock hidden" id="lock"><div class="card"><h2 id="lockTitle">Private Ebook</h2><p id="lockText">Enter the password to open this flipbook.</p><input id="passwordInput" type="password" autocomplete="current-password" /><button class="btn primary" id="unlockBtn" type="button">Open</button><p id="lockError" style="color:#fecaca;margin-top:10px"></p></div></div>
<div class="app" id="app">
  <header class="topbar">
    <div class="brand"><h1 id="bookTitle"></h1><p id="bookMeta"></p></div>
    <div class="toolbar">
      <button class="btn" id="firstBtn" type="button">First</button>
      <button class="btn" id="prevBtn" type="button">Prev</button>
      <span class="chip" id="pageChip">0 / 0</span>
      <button class="btn" id="nextBtn" type="button">Next</button>
      <button class="btn" id="lastBtn" type="button">Last</button>
      <button class="btn" id="zoomOutBtn" type="button">-</button>
      <button class="btn" id="zoomInBtn" type="button">+</button>
      <button class="btn" id="notesBtn" type="button">Notes</button>
      <button class="btn" id="fullBtn" type="button">Fullscreen</button>
      <a class="btn primary" id="downloadBtn" href="#" target="_blank" rel="noopener">PDF</a>
      <span class="chip file" id="fileChip"></span>
    </div>
  </header>
  <main class="main">
    <aside class="thumbs" id="thumbs"></aside>
    <section class="stage-wrap" id="stage">
      <button class="edge prev" id="edgePrev" type="button" aria-label="Previous page"></button>
      <div id="book" class="book"></div>
      <div id="fallbackBook" class="fallback-book hidden"><div id="fallbackPage" class="fallback-page"></div></div>
      <button class="edge next" id="edgeNext" type="button" aria-label="Next page"></button>
      <div class="hud"><button class="btn" id="hudPrev" type="button">‹</button><span class="chip" id="hudPage">0 / 0</span><button class="btn" id="hudNext" type="button">›</button></div>
    </section>
    <aside class="notes" id="notesPanel">
      <h2 id="notesTitle">Notes</h2>
      <textarea id="notesBox" placeholder="Write notes for this page..."></textarea>
      <div class="search"><input id="searchInput" type="search" placeholder="Search inside PDF" /><button class="btn" id="searchBtn" type="button">Search</button></div>
      <div class="results" id="searchResults"></div>
    </aside>
  </main>
</div>
<div class="toast hidden" id="toast"></div>
<script>
(function(){
  var cfg = ${configJson};
  var isFa = cfg.language === 'fa' || cfg.language === 'both';
  var txt = isFa ? {
    loading:'در حال آماده سازی Ebook', rendering:'در حال رندر صفحات...', private:'کتاب خصوصی', pass:'برای باز کردن این فلیپ بوک رمز را وارد کنید.', open:'باز کردن', wrong:'رمز اشتباه است.', first:'اول', prev:'قبلی', next:'بعدی', last:'آخر', notes:'نوت ها', full:'تمام صفحه', pdf:'PDF', saved:'نوت ذخیره شد', search:'جستجو', searchPh:'جستجو داخل PDF', noResults:'نتیجه ای پیدا نشد', page:'صفحه'
  } : {
    loading:'Loading Ebook', rendering:'Rendering pages...', private:'Private Ebook', pass:'Enter the password to open this flipbook.', open:'Open', wrong:'Wrong password.', first:'First', prev:'Prev', next:'Next', last:'Last', notes:'Notes', full:'Fullscreen', pdf:'PDF', saved:'Note saved', search:'Search', searchPh:'Search inside PDF', noResults:'No results found', page:'Page'
  };
  var pdfDoc = null, pageFlip = null, currentPage = 1, pageCount = 0, zoom = 1, pages = [], pageTexts = [], fallbackMode = false;
  var book = document.getElementById('book'), fallbackBook = document.getElementById('fallbackBook'), fallbackPage = document.getElementById('fallbackPage');
  var loader = document.getElementById('loader'), progress = document.getElementById('progress'), notesBox = document.getElementById('notesBox'), notesPanel = document.getElementById('notesPanel');
  function setText(id,value){ var el=document.getElementById(id); if(el) el.textContent=value; }
  function showToast(message){ var el=document.getElementById('toast'); el.textContent=message; el.classList.remove('hidden'); clearTimeout(showToast.t); showToast.t=setTimeout(function(){el.classList.add('hidden');},1400); }
  function noteKey(page){ return 'ebook_notes_' + cfg.shortCode + '_' + page; }
  function saveNote(){ try{ localStorage.setItem(noteKey(currentPage), notesBox.value || ''); showToast(txt.saved); }catch(e){} }
  function loadNote(){ try{ notesBox.value = localStorage.getItem(noteKey(currentPage)) || ''; }catch(e){ notesBox.value=''; } }
  function updateUi(){
    setText('pageChip', currentPage + ' / ' + pageCount);
    setText('hudPage', currentPage + ' / ' + pageCount);
    document.querySelectorAll('.thumb').forEach(function(btn){ btn.classList.toggle('active', Number(btn.dataset.page) === currentPage); });
    loadNote();
  }
  function renderNativePage(page, animate){
    if(!pages[page - 1]) return;
    currentPage = page;
    fallbackPage.innerHTML = '';
    fallbackPage.appendChild(pages[currentPage - 1].cloneNode(true));
    fallbackPage.classList.remove('turning');
    if(animate){
      void fallbackPage.offsetWidth;
      fallbackPage.classList.add('turning');
      setTimeout(function(){ fallbackPage.classList.remove('turning'); }, 430);
    }
    updateUi();
  }
  async function hashPassword(salt, password){
    if(!window.crypto || !crypto.subtle) return '';
    var data = new TextEncoder().encode(salt + ':' + password);
    var buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }
  async function unlock(){
    var input = document.getElementById('passwordInput');
    var got = await hashPassword(cfg.passwordSalt || cfg.shortCode, input.value || '');
    if(got && got === cfg.passwordHash){ document.getElementById('lock').classList.add('hidden'); start(); }
    else setText('lockError', txt.wrong);
  }
  function go(page){
    page = Math.max(1, Math.min(pageCount, page));
    if(page === currentPage) return;
    if(pageFlip && !fallbackMode){
      try {
        var expected = page;
        pageFlip.flip(page - 1);
        setTimeout(function(){
          if(currentPage !== expected){
            fallbackMode = true;
            pageFlip = null;
            book.classList.add('hidden');
            fallbackBook.classList.remove('hidden');
            renderNativePage(expected, true);
          }
        }, 900);
        return;
      } catch(e) {
        fallbackMode = true;
        pageFlip = null;
        book.classList.add('hidden');
        fallbackBook.classList.remove('hidden');
      }
    }
    renderNativePage(page, true);
  }
  function initFlip(){
    // Native page mode is deliberately the default: it avoids page-flip library
    // state bugs that can block multi-page PDFs after the first turns.
    fallbackMode = true;
    pageFlip = null;
    book.classList.add('hidden');
    fallbackBook.classList.remove('hidden');
    renderNativePage(Math.max(1, Math.min(currentPage, pages.length || 1)), false);
    return;
    try {
      pageFlip = new St.PageFlip(book, { width: 560, height: 760, size:'stretch', minWidth:260, maxWidth:620, minHeight:360, maxHeight:820, showCover:true, usePortrait:true, mobileScrollSupport:false, maxShadowOpacity:.38, flippingTime:760, direction: cfg.direction === 'rtl' ? 'rtl' : 'ltr' });
      pageFlip.loadFromHTML(document.querySelectorAll('.page'));
      pageFlip.on('flip', function(e){ currentPage = e.data + 1; updateUi(); });
      fallbackBook.classList.add('hidden');
      book.classList.remove('hidden');
    } catch(e) {
      fallbackMode = true;
      book.classList.add('hidden');
      fallbackBook.classList.remove('hidden');
      fallbackPage.innerHTML = '';
      fallbackPage.appendChild(pages[0].cloneNode(true));
      updateUi();
    }
  }
  async function renderPage(n){
    var page = await pdfDoc.getPage(n);
    var viewport = page.getViewport({ scale: Math.min(2.2, 1.22 * zoom) });
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    var wrap = document.createElement('div');
    wrap.className = 'page';
    wrap.dataset.page = String(n);
    wrap.appendChild(canvas);
    return wrap;
  }
  async function renderThumb(n){
    try {
      var page = await pdfDoc.getPage(n);
      var viewport = page.getViewport({ scale: .18 });
      var canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'thumb'; btn.dataset.page = String(n); btn.appendChild(canvas);
      btn.onclick = function(){ go(n); };
      document.getElementById('thumbs').appendChild(btn);
    } catch(e) {}
  }
  async function indexText(n){
    try {
      var content = await (await pdfDoc.getPage(n)).getTextContent();
      pageTexts[n] = content.items.map(function(item){ return item.str || ''; }).join(' ');
    } catch(e) { pageTexts[n] = ''; }
  }
  async function loadPages(){
    book.innerHTML = ''; document.getElementById('thumbs').innerHTML = ''; pages = []; pageTexts = [];
    for(var i=1;i<=pageCount;i++){
      setText('loadingText', txt.rendering + ' ' + i + ' / ' + pageCount);
      progress.style.width = Math.round((i / pageCount) * 100) + '%';
      var rendered = await renderPage(i);
      pages.push(rendered);
      book.appendChild(rendered);
      renderThumb(i);
      indexText(i);
    }
    initFlip();
    loader.classList.add('hidden');
  }
  async function start(){
    setText('loadingTitle', txt.loading);
    setText('loadingText', txt.rendering);
    if(window.pdfjsLib){ pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }
    pdfDoc = await pdfjsLib.getDocument({ url: cfg.pdfUrl }).promise;
    pageCount = pdfDoc.numPages || 0;
    await loadPages();
  }
  function runSearch(){
    var q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
    var box = document.getElementById('searchResults');
    box.innerHTML = '';
    if(!q) return;
    var matches = [];
    for(var i=1;i<=pageCount;i++){ if((pageTexts[i] || '').toLowerCase().indexOf(q) >= 0) matches.push(i); }
    if(!matches.length){ var empty=document.createElement('div'); empty.className='result'; empty.textContent=txt.noResults; box.appendChild(empty); return; }
    matches.slice(0,30).forEach(function(p){ var btn=document.createElement('button'); btn.type='button'; btn.className='result'; btn.textContent=txt.page + ' ' + p; btn.onclick=function(){go(p);}; box.appendChild(btn); });
  }
  setText('bookTitle', cfg.title);
  setText('bookMeta', cfg.accessMode === 'private' ? txt.private : cfg.fileName);
  setText('fileChip', cfg.fileName);
  setText('loadingTitle', txt.loading); setText('loadingText', txt.rendering);
  setText('lockTitle', txt.private); setText('lockText', txt.pass); setText('unlockBtn', txt.open);
  setText('firstBtn', txt.first); setText('prevBtn', txt.prev); setText('nextBtn', txt.next); setText('lastBtn', txt.last); setText('notesBtn', txt.notes); setText('fullBtn', txt.full); setText('downloadBtn', txt.pdf); setText('notesTitle', txt.notes); setText('searchBtn', txt.search);
  document.getElementById('searchInput').placeholder = txt.searchPh;
  document.getElementById('downloadBtn').href = cfg.pdfUrl;
  if(!cfg.allowDownload) document.getElementById('downloadBtn').classList.add('hidden');
  document.getElementById('firstBtn').onclick=function(){go(1);}; document.getElementById('lastBtn').onclick=function(){go(pageCount);};
  document.getElementById('prevBtn').onclick=function(){go(currentPage-1);}; document.getElementById('nextBtn').onclick=function(){go(currentPage+1);};
  document.getElementById('hudPrev').onclick=function(){go(currentPage-1);}; document.getElementById('hudNext').onclick=function(){go(currentPage+1);};
  document.getElementById('edgePrev').onclick=function(){go(currentPage-1);}; document.getElementById('edgeNext').onclick=function(){go(currentPage+1);};
  document.getElementById('zoomInBtn').onclick=function(){ zoom=Math.min(1.8,zoom+.15); loader.classList.remove('hidden'); loadPages(); };
  document.getElementById('zoomOutBtn').onclick=function(){ zoom=Math.max(.75,zoom-.15); loader.classList.remove('hidden'); loadPages(); };
  document.getElementById('fullBtn').onclick=function(){ var el=document.documentElement; if(el.requestFullscreen) el.requestFullscreen(); else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen(); };
  document.getElementById('notesBtn').onclick=function(){ notesPanel.classList.toggle('open'); };
  document.getElementById('searchBtn').onclick=runSearch;
  document.getElementById('searchInput').onkeydown=function(e){ if(e.key === 'Enter') runSearch(); };
  notesBox.addEventListener('input', function(){ clearTimeout(notesBox._t); notesBox._t=setTimeout(saveNote, 450); });
  document.addEventListener('keydown', function(e){ if(e.key==='ArrowLeft') go(cfg.direction==='rtl'?currentPage+1:currentPage-1); if(e.key==='ArrowRight') go(cfg.direction==='rtl'?currentPage-1:currentPage+1); });
  document.getElementById('unlockBtn').onclick=unlock;
  document.getElementById('passwordInput').onkeydown=function(e){ if(e.key==='Enter') unlock(); };
  if(cfg.accessMode === 'private' && cfg.passwordHash){ loader.classList.add('hidden'); document.getElementById('lock').classList.remove('hidden'); }
  else start();
})();
</script>
</body>
</html>`;
};
