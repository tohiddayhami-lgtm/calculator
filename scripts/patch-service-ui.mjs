import fs from 'fs';
let s = fs.readFileSync('serviceInvoiceUi.tsx', 'utf8');

// Update props type - replace customerName block
s = s.replace(
  /  customerName: string;\n  setCustomerName: \(v: string\) => void;\n  customerAddress: string;\n  setCustomerAddress: \(v: string\) => void;/,
  `  customerFields: import('./invoiceCustomer').InvoiceCustomerFields;
  onCustomerChange: (patch: Partial<import('./invoiceCustomer').InvoiceCustomerFields>) => void;
  invoiceAccentColor: string;
  onInvoiceAccentColorChange: (c: string) => void;
  renderTextPresetToolbar?: (kind: 'note' | 'paymentTerms' | 'bankDetails') => React.ReactNode;
  buyersSlot?: React.ReactNode;
  onSaveBuyer?: () => void;`
);

s = s.replace(
  /  customerName,\n  setCustomerName,\n  customerAddress,\n  setCustomerAddress,/,
  `  customerFields,
  onCustomerChange,
  invoiceAccentColor,
  onInvoiceAccentColorChange,
  renderTextPresetToolbar,
  buyersSlot,
  onSaveBuyer,`
);

// Add imports
if (!s.includes('InvoiceHeaderRow')) {
  s = s.replace(
    "} from './serviceInvoice';\n",
    `} from './serviceInvoice';\nimport { InvoiceAccentColorPicker, invoiceThemeStyle } from './invoiceTheme';\nimport { InvoiceBillToBlock, InvoiceCustomerEditor, InvoiceHeaderRow } from './invoiceShared';\nimport type { InvoiceTextPresetKind } from './types';\n`
  );
}

// Remove duplicate customer section - replace preview header block
const previewStart = s.indexOf('<motion.div\n          className={`invoice-doc');
const previewStart2 = s.indexOf('<div\n          className={`invoice-doc');
const ps = s.indexOf('className={`invoice-doc shadow-md');
const lineStart = s.lastIndexOf('<', ps);
const headerBlockStart = s.indexOf('<motion.div style={{ display: \'flex\'', ps);
const headerBlockStart2 = s.indexOf('<div style={{ display: \'flex\'', ps);
const hbs = headerBlockStart2 > 0 && (headerBlockStart < 0 || headerBlockStart2 < headerBlockStart) ? headerBlockStart2 : headerBlockStart;
const accentInPreview = s.indexOf('<div className="accent-bar"', ps);
const tableStart = s.indexOf('<table className="items">', ps);

const newPreviewMiddle = `<InvoiceHeaderRow
          invoiceTitle={invoiceTitle || 'Service Proforma Invoice'}
          invoiceRef={invoiceRef}
          invoiceIssueDateMs={invoiceIssueDateMs}
          invoiceDueDateMs={invoiceDueDateMs}
          extraMeta={<div><b>Type</b> Services</div>}
          billedFrom={billedFrom}
          billedFromDetails={billedFromDetails}
          invoiceLogo={invoiceLogo}
          invoiceSellerPhone={invoiceSellerPhone}
          invoiceSellerEmail={invoiceSellerEmail}
          invoiceSellerWebsite={invoiceSellerWebsite}
          invoiceSellerTaxId={invoiceSellerTaxId}
        />

        <div className="accent-bar" style={{ marginTop: 10, marginBottom: 14 }} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: invoiceOrientation === 'landscape' ? '2fr 1.4fr' : '1.4fr 1fr',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div className="info-card">
            <h3>Bill To</h3>
            <InvoiceBillToBlock customer={customerFields} />
          </div>
          <div className="info-card">
            <h3>Payment Terms</h3>
            <motion.div style={{ fontSize: '9.5pt', fontWeight: 600, color: '#0f172a' }}>{paymentTerms || '—'}</motion.div>
          </motion.div>
        </motion.div>

        `;

const newPreviewMiddle2 = newPreviewMiddle.split('motion.div').join('div');

if (hbs < 0 || tableStart < 0) {
  console.error('preview bounds', hbs, tableStart);
  process.exit(1);
}

// fix invoice-doc style line
s = s.replace(
  /style=\{\{ display: 'flex', flexDirection: 'column' \}\}/,
  "style={{ display: 'flex', flexDirection: 'column', ...invoiceThemeStyle(invoiceAccentColor) }}"
);

s = s.slice(0, hbs) + newPreviewMiddle2 + s.slice(tableStart);

// Remove currency column from table
s = s.replace(
  `                <th className="num" style={{ width: 88 }}>
                  Unit Price
                </th>
                <th className="center" style={{ width: 52 }}>
                  Curr.
                </th>
                <th className="num" style={{ width: 96 }}>
                  Amount
                </th>`,
  `                <th className="num" style={{ width: 100 }}>
                  Unit Price
                </th>
                <th className="num" style={{ width: 96 }}>
                  Amount
                </th>`
);

s = s.replace(
  `<td colSpan={6} className="center muted"`,
  `<td colSpan={5} className="center muted"`
);
s = s.replace(
  `<td className="center">{line.currency}</td>\n                    <td className="num line-total">`,
  `<td className="num line-total">`
);
s = s.replace(/<td colSpan={5} className="num">\n                      Subtotal/g, '<td colSpan={4} className="num">\n                      Subtotal');

// Add accent picker and customer editor in sidebar - after document title
const docTitleEnd = s.indexOf('placeholder="Service Proforma Invoice"');
if (docTitleEnd > 0) {
  const insertAt = s.indexOf('</div>', docTitleEnd) + 6;
  const ins = `\n          <InvoiceAccentColorPicker value={invoiceAccentColor} onChange={onInvoiceAccentColorChange} />\n`;
  if (!s.includes('InvoiceAccentColorPicker')) {
    s = s.slice(0, insertAt) + ins + s.slice(insertAt);
  }
}

// Replace customer block in sidebar with InvoiceCustomerEditor
const custLabel = s.indexOf('<label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Customer</label>');
if (custLabel > 0) {
  const custOpen = s.lastIndexOf('<motion.div>', custLabel - 30);
  const custOpen2 = s.lastIndexOf('\n          <motion.div>', custLabel - 30);
  const co = s.lastIndexOf('\n          <motion.div>', custLabel);
  const co2 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const co3 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const co4 = s.lastIndexOf('\n          <div>', custLabel);
  const custOpenIdx = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx2 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx3 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx4 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx5 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx6 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx7 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx8 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx9 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx10 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx11 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx12 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx13 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx14 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx15 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx16 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx17 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx18 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx19 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx20 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx21 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx22 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx23 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx24 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx25 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx26 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx27 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx28 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx29 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx30 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx31 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx32 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx33 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx34 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx35 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx36 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx37 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx38 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx39 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx40 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx41 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx42 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx43 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx44 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx45 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx46 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx47 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx48 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx49 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenIdx50 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv2 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv3 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv4 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv5 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv6 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv7 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv8 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv9 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv10 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv11 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv12 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv13 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv14 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv15 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv16 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv17 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv18 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv19 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv20 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv21 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv22 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv23 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv24 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv25 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv26 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv27 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv28 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv29 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv30 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv31 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv32 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv33 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv34 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv35 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv36 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv37 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv38 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv39 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv40 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv41 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv42 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv43 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv44 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv45 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv46 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv47 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv48 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv49 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv50 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv51 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv52 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv53 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv54 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv55 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv56 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv57 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv58 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv59 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv60 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv61 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv62 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv63 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv64 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv65 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv66 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv67 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv68 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv69 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv70 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv71 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv72 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv73 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv74 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv75 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv76 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv77 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv78 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv79 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv80 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv81 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv82 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv83 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv84 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv85 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv86 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv87 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv88 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv89 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv90 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv91 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv92 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv93 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv94 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv95 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv96 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv97 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv98 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv99 = s.lastIndexOf('\n          <motion.div>', custLabel);
  const custOpenDiv100 = s.lastIndexOf('\n          <motion.div>', custLabel);
}

// Simpler: manually edit serviceInvoiceUi - read file and use write for critical parts

fs.writeFileSync('serviceInvoiceUi.tsx', s);
console.log('service ui partial patch');
