import fs from 'fs';
const p = 'App.tsx';
let s = fs.readFileSync(p, 'utf8');
const marker = '<label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Buyer (Billed To)</label>';
const start = s.indexOf(marker);
if (start < 0) {
  console.error('marker not found');
  process.exit(1);
}
const openDiv = s.lastIndexOf('\n                   <div>', start);
const endHr = s.indexOf('\n\n                   <hr className="border-slate-100"/>', start);
if (openDiv < 0 || endHr < 0) {
  console.error('bounds', openDiv, endHr);
  process.exit(1);
}
const rep = `
                   <InvoiceCustomerEditor
                       {...getInvoiceCustomerFields()}
                       onChange={patchInvoiceCustomer}
                       buyersSlot={renderInvoiceBuyerPicker()}
                       onSaveBuyer={handleSaveCurrentBuyer}
                   />
`;
s = s.slice(0, openDiv) + rep + s.slice(endHr);
fs.writeFileSync(p, s);
console.log('patched buyer block');
