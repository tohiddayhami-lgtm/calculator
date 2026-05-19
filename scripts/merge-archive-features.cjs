/**
 * Re-apply invoice archive separation from corrupted backup onto restored App.tsx.
 * Skips lines containing ???? (encoding corruption).
 */
const fs = require('fs');

const goodPath = 'App.tsx';
const badPath = 'App.tsx.corrupted.bak';

let good = fs.readFileSync(goodPath, 'utf8');
const bad = fs.readFileSync(badPath, 'utf8');

function extractFunction(src, name) {
  const needle = `const ${name}`;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`Function not found: ${name}`);
  let i = start;
  let depth = 0;
  let started = false;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '{') {
      depth++;
      started = true;
    } else if (ch === '}') {
      depth--;
      if (started && depth === 0) {
        i++;
        while (i < src.length && (src[i] === ';' || src[i] === '\n' || src[i] === '\r')) {
          if (src[i] === ';') {
            i++;
            break;
          }
          i++;
        }
        return src.slice(start, i);
      }
    }
    i++;
  }
  throw new Error(`Unclosed function: ${name}`);
}

function replaceFunction(target, name, replacement) {
  const old = extractFunction(target, name);
  if (old.includes('????')) {
    console.warn(`skip ${name}: replacement still corrupted`);
    return target;
  }
  return target.replace(old, replacement);
}

// --- imports ---
if (!good.includes("from './invoiceArchive'")) {
  good = good.replace(
    "import { InvoiceDocKindTabs, ServiceInvoicePanel, type InvoiceDocKind } from './serviceInvoiceUi';",
    `import { InvoiceDocKindTabs, ServiceInvoicePanel, type InvoiceDocKind } from './serviceInvoiceUi';
import {
  archivedInvoiceKindLabel,
  buildServiceArchiveSnapshot,
  normalizeArchivedInvoice,
  normalizeArchivedInvoiceKind,
} from './invoiceArchive';
import {
  ArchiveCustomerBalanceSummary,
  ArchiveLegacyMisarchiveBanner,
  ArchiveSelectedItemsTable,
} from './archiveInvoiceUi';`,
  );
  good = good.replace(
    '  parseServiceInvoiceLines,\n  roundServiceLineAmount,',
    '  parseServiceInvoiceLines,\n  formatServiceInvoiceMoney,\n  roundServiceLineAmount,',
  );
}

// --- state ---
if (!good.includes('archiveKindFilter')) {
  good = good.replace(
    "const [archiveStatusFilter, setArchiveStatusFilter] = useState<'all' | ArchivedInvoiceStatus>('all');",
    `const [archiveStatusFilter, setArchiveStatusFilter] = useState<'all' | ArchivedInvoiceStatus>('all');
  const [archiveKindFilter, setArchiveKindFilter] = useState<'all' | 'products' | 'services'>('all');`,
  );
}

// --- buildArchiveSnapshot ---
if (!good.includes("invoiceKind: 'products'")) {
  good = good.replace(
    '    return {\n      invoiceRef: invoiceRef || `INV-${Date.now()}`,',
    `    return {
      invoiceKind: 'products',
      customerKind: invoiceDocKind === 'services' ? 'services' : 'export',
      invoiceRef: invoiceRef || \`INV-\${Date.now()}\`,`,
  );
}

// --- archive listener ---
good = good.replace(
  'const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as ArchivedInvoice[];',
  `const list = snap.docs
          .map((d: any) => normalizeArchivedInvoice({ id: d.id, ...d.data() } as ArchivedInvoice));`,
);

// --- handleArchiveCurrentInvoice ---
let handleArchive = extractFunction(bad, 'handleArchiveCurrentInvoice');
handleArchive = handleArchive.replace(
  "alert('????? ?? ???? ????? ?? ???? ????? ???? ????? ???? ???.');",
  "alert('حداقل یک ردیف خدمات با مبلغ معتبر برای آرشیو لازم است.');",
);
good = replaceFunction(good, 'handleArchiveCurrentInvoice', handleArchive);

// --- recall ---
let recall = extractFunction(bad, 'recallArchivedInvoiceForEditing');
recall = recall.replace(
  /alert\(\s*`[^`]*\$\{included\.length\}[^`]*`\s*\);/s,
  `alert(
        \`بازیابی انجام شد؛ \${included.length} ردیف با کالاهای همین پروژه هم‌خوان شد.\\nشناسهٔ کالاهایی که در پروژه نیستند و حذف شدند: \${missing.join(', ')}\`
      );`,
);
good = replaceFunction(good, 'recallArchivedInvoiceForEditing', recall);

// --- handleUpdate ---
let handleUpdate = extractFunction(bad, 'handleUpdateArchivedInvoiceFromEditor');
handleUpdate = handleUpdate
  .replace(
    "alert('???? ?????????? ????? ????? ???? ???? ???? ???? ? ?? ????? ????????? ???? ?????? ?? ?????.');",
    "alert('برای به‌روزرسانی آرشیو، ابتدا وارد حساب ابری شوید و از آرشیو «بازخوانی برای ویرایش» را بزنید.');",
  )
  .replace("alert('??? ????? ?? ????? ???? ??? ???? ?? ???? ????.');", "alert('این فاکتور در آرشیو پیدا نشد؛ لیست را رفرش کنید.');")
  .replace(
    "alert('????? ????? ?? ??????? ??? ????? ?? (???????? ??? ????).');",
    "alert('فاکتور آرشیو با تغییرات شما به‌روز شد (پرداخت‌ها حفظ شدند).');",
  )
  .replace("alert('?????????? ????? ??????: '", "alert('به‌روزرسانی آرشیو ناموفق: '");
good = replaceFunction(good, 'handleUpdateArchivedInvoiceFromEditor', handleUpdate);

// --- Academy tab ---
good = good.replace(
  '<GraduationCap className="w-4 h-4" /> آموزش',
  '<GraduationCap className="w-4 h-4" /> Academy',
);

// --- archive modal: kind filter + counts (patch restored modal) ---
if (!good.includes('archiveKindFilter ===')) {
  good = good.replace(
    `.filter((inv) => archiveStatusFilter === 'all' || inv.status === archiveStatusFilter)
                  .filter((inv) => {
                      if (!archiveSearch.trim()) return true;`,
    `.filter((inv) => archiveStatusFilter === 'all' || inv.status === archiveStatusFilter)
                  .filter((inv) => {
                      if (archiveKindFilter === 'all') return true;
                      return normalizeArchivedInvoiceKind(inv.invoiceKind) === archiveKindFilter;
                  })
                  .filter((inv) => {
                      if (!archiveSearch.trim()) return true;`,
  );

  good = good.replace(
    'const selected = archivedInvoices.find((inv) => inv.id === selectedArchiveId) || null;',
    `const selectedRaw = archivedInvoices.find((inv) => inv.id === selectedArchiveId) || null;
              const selected = selectedRaw ? normalizeArchivedInvoice(selectedRaw) : null;
              const productsArchiveCount = archivedInvoices.filter(
                (i) => normalizeArchivedInvoiceKind(i.invoiceKind) === 'products',
              ).length;
              const servicesArchiveCount = archivedInvoices.filter(
                (i) => normalizeArchivedInvoiceKind(i.invoiceKind) === 'services',
              ).length;`,
  );

  good = good.replace(
    '<span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full font-medium text-slate-600">{archivedInvoices.length} total</span>',
    `<span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full font-medium text-slate-600">
                                    {archivedInvoices.length} کل · {productsArchiveCount} صادرات · {servicesArchiveCount} خدمات
                                  </span>`,
  );

  good = good.replace(
    `placeholder="Search ref / customer / titleâ€¦"`,
    'placeholder="جستجو: شماره / مشتری / عنوان"',
  );

  good = good.replace(
    `                                      <div className="flex flex-wrap gap-1">
                                          {statusOptions.map((opt) => (`,
    `                                      <div className="flex flex-wrap gap-1">
                                        {(
                                          [
                                            ['all', 'همه'],
                                            ['products', 'صادرات / کالا'],
                                            ['services', 'خدمات'],
                                          ] as const
                                        ).map(([id, label]) => (
                                          <button
                                            key={id}
                                            type="button"
                                            onClick={() => setArchiveKindFilter(id)}
                                            className={\`text-[10px] font-semibold px-2 py-1 rounded-full border \${
                                              archiveKindFilter === id
                                                ? 'border-indigo-500 bg-indigo-600 text-white'
                                                : 'border-slate-200 bg-white text-slate-600'
                                            }\`}
                                          >
                                            {label}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                          {statusOptions.map((opt) => (`,
  );
  // fix accidental motion typo if script introduced it
  good = good.replace(/<motion className=/g, '<motion className=').replace(/motion\.div/g, 'div');
  good = good.replace('<motion className="flex flex-wrap gap-1">', '<div className="flex flex-wrap gap-1">');
}

fs.writeFileSync(goodPath, good, 'utf8');
console.log('merge done; ???? count:', (good.match(/\?\?\?\?/g) || []).length);
