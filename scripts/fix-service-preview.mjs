import fs from 'fs';
let s = fs.readFileSync('serviceInvoiceUi.tsx', 'utf8');

s = s.replace(
  'placeholder="Service Proforma Invoice"\n            />\n          </div>\n          <motion.div>\n            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Invoice #</label>',
  'placeholder="Service Proforma Invoice"\n            />\n          </div>\n          <InvoiceAccentColorPicker value={invoiceAccentColor} onChange={onInvoiceAccentColorChange} />\n          <div>\n            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Invoice #</label>'
);
s = s.replace('placeholder="Service Proforma Invoice"\n            />\n          </div>\n          <div>\n            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Invoice #</label>',
  'placeholder="Service Proforma Invoice"\n            />\n          </motion.div>\n          <InvoiceAccentColorPicker value={invoiceAccentColor} onChange={onInvoiceAccentColorChange} />\n          <motion.div>\n            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Invoice #</label>');

// fix accidental motion.div
s = s.split('motion.div').join('div');

const hStart = s.indexOf('<div style={{ display: \'flex\', justifyContent: \'space-between\'');
const tableStart = s.indexOf('<table className="items">', hStart);
if (hStart < 0 || tableStart < 0) {
  console.error('bounds', hStart, tableStart);
  process.exit(1);
}
const mid = `<InvoiceHeaderRow
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

          <motion.div className="accent-bar" style={{ marginTop: 10, marginBottom: 14 }} />

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
              <div style={{ fontSize: '9.5pt', fontWeight: 600, color: '#0f172a' }}>{paymentTerms || '—'}</div>
            </div>
          </div>

          `;
s = s.slice(0, hStart) + mid.split('motion.div').join('motion.div').split('motion.div').join('div') + s.slice(tableStart);

s = s.replace("style={{ display: 'flex', flexDirection: 'column' }}", "style={{ display: 'flex', flexDirection: 'column', ...invoiceThemeStyle(invoiceAccentColor) }}");

s = s.replace(
  `<th className="num" style={{ width: 88 }}>
                  Unit Price
                </th>
                <th className="center" style={{ width: 52 }}>
                  Curr.
                </th>
                <th className="num" style={{ width: 96 }}>
                  Amount
                </th>`,
  `<th className="num" style={{ width: 100 }}>
                  Unit Price
                </th>
                <th className="num" style={{ width: 96 }}>
                  Amount
                </th>`
);
s = s.replace('<td colSpan={6}', '<td colSpan={5}');
s = s.replace(/<td className="center">\{line\.currency\}<\/td>\s*\n\s*<td className="num line-total">/, '<td className="num line-total">');
s = s.replace('<td colSpan={5} className="num">\n                      Subtotal', '<td colSpan={4} className="num">\n                      Subtotal');

fs.writeFileSync('serviceInvoiceUi.tsx', s);
console.log('done');
