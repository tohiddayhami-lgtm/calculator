import fs from 'fs';
const p = 'App.tsx';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  'style={{ display: \'flex\', flexDirection: \'column\' }}\n               >\n                   {invoiceLayout === \'welte\'',
  'style={{ display: \'flex\', flexDirection: \'column\', ...invoiceThemeStyle(invoiceAccentColor) }}\n               >\n                   {invoiceLayout === \'welte\''
);

const headerStart = s.indexOf('{/* ── HEADER ────────────────────────────────────────────── */}');
const headerEnd = s.indexOf('<motion.div className="accent-bar"', headerStart);
const headerEnd2 = s.indexOf('<div className="accent-bar"', headerStart);
const accentIdx = headerEnd2 > 0 ? headerEnd2 : headerEnd;
if (headerStart < 0 || accentIdx < 0) {
  console.error('header', headerStart, accentIdx);
  process.exit(1);
}
const headerRep = `<InvoiceHeaderRow
                     invoiceTitle={invoiceTitle}
                     invoiceRef={invoiceRef}
                     invoiceIssueDateMs={invoiceIssueDateMs}
                     invoiceDueDateMs={invoiceDueDateMs}
                     extraMeta={
                       invoiceTerms.length > 0 ? (
                         <div><b>Incoterms</b> {invoiceTerms.join(' · ')}</motion.div>
                       ) : null
                     }
                     billedFrom={billedFrom}
                     billedFromDetails={billedFromDetails}
                     invoiceLogo={invoiceLogo}
                     invoiceSellerPhone={invoiceSellerPhone}
                     invoiceSellerEmail={invoiceSellerEmail}
                     invoiceSellerWebsite={invoiceSellerWebsite}
                     invoiceSellerTaxId={invoiceSellerTaxId}
                   />

                   `;
// fix motion.div typo in rep
const headerRepFixed = headerRep.replace(/motion\.div/g, 'motion.div').replace(/<\/motion\.div>/g, '</motion.div>').replace(/motion\.motion.div/g, 'motion.div');
const headerRep2 = `<InvoiceHeaderRow
                     invoiceTitle={invoiceTitle}
                     invoiceRef={invoiceRef}
                     invoiceIssueDateMs={invoiceIssueDateMs}
                     invoiceDueDateMs={invoiceDueDateMs}
                     extraMeta={
                       invoiceTerms.length > 0 ? (
                         <div><b>Incoterms</b> {invoiceTerms.join(' · ')}</motion.div>
                       ) : null
                     }
                     billedFrom={billedFrom}
                     billedFromDetails={billedFromDetails}
                     invoiceLogo={invoiceLogo}
                     invoiceSellerPhone={invoiceSellerPhone}
                     invoiceSellerEmail={invoiceSellerEmail}
                     invoiceSellerWebsite={invoiceSellerWebsite}
                     invoiceSellerTaxId={invoiceSellerTaxId}
                   />

                   `;
// manual fix without motion
const headerRep3 = `<InvoiceHeaderRow
                     invoiceTitle={invoiceTitle}
                     invoiceRef={invoiceRef}
                     invoiceIssueDateMs={invoiceIssueDateMs}
                     invoiceDueDateMs={invoiceDueDateMs}
                     extraMeta={
                       invoiceTerms.length > 0 ? (
                         <div><b>Incoterms</b> {invoiceTerms.join(' · ')}</motion.div>
                       ) : null
                     }
                     billedFrom={billedFrom}
                     billedFromDetails={billedFromDetails}
                     invoiceLogo={invoiceLogo}
                     invoiceSellerPhone={invoiceSellerPhone}
                     invoiceSellerEmail={invoiceSellerEmail}
                     invoiceSellerWebsite={invoiceSellerWebsite}
                     invoiceSellerTaxId={invoiceSellerTaxId}
                   />

                   `;

const hr = `<InvoiceHeaderRow
                     invoiceTitle={invoiceTitle}
                     invoiceRef={invoiceRef}
                     invoiceIssueDateMs={invoiceIssueDateMs}
                     invoiceDueDateMs={invoiceDueDateMs}
                     extraMeta={
                       invoiceTerms.length > 0 ? (
                         <div><b>Incoterms</b> {invoiceTerms.join(' · ')}</div>
                       ) : null
                     }
                     billedFrom={billedFrom}
                     billedFromDetails={billedFromDetails}
                     invoiceLogo={invoiceLogo}
                     invoiceSellerPhone={invoiceSellerPhone}
                     invoiceSellerEmail={invoiceSellerEmail}
                     invoiceSellerWebsite={invoiceSellerWebsite}
                     invoiceSellerTaxId={invoiceSellerTaxId}
                   />

                   `;

s = s.slice(0, headerStart) + hr + s.slice(accentIdx);

const billToOld = `<div className="info-card">
                           <h3>Bill To</h3>
                           <div style={{ fontSize: '10pt', fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                               {customerName || 'Customer Name'}
                           </div>
                           <div className="small" style={{ whiteSpace: 'pre-line', marginTop: 2 }}>
                               {customerAddress || '—'}
                           </div>
                       </div>`;
const billToNew = `<div className="info-card">
                           <h3>Bill To</h3>
                           <InvoiceBillToBlock customer={getInvoiceCustomerFields()} />
                       </div>`;
if (!s.includes(billToOld)) {
  console.error('billTo not found');
  process.exit(1);
}
s = s.replace(billToOld, billToNew);

fs.writeFileSync(p, s);
console.log('preview patched');
