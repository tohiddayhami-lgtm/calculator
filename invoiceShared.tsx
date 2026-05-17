import React from 'react';
import type { InvoiceCustomerFields } from './invoiceCustomer';
import { customerDisplayName } from './invoiceCustomer';

export type InvoiceHeaderProps = {
  invoiceTitle: string;
  invoiceRef: string;
  invoiceIssueDateMs: number;
  invoiceDueDateMs?: number;
  extraMeta?: React.ReactNode;
  billedFrom: string;
  billedFromDetails: string;
  invoiceLogo: string;
  invoiceSellerPhone: string;
  invoiceSellerEmail: string;
  invoiceSellerWebsite: string;
  invoiceSellerTaxId: string;
};

export function InvoiceHeaderRow(props: InvoiceHeaderProps) {
  const {
    invoiceTitle,
    invoiceRef,
    invoiceIssueDateMs,
    invoiceDueDateMs,
    extraMeta,
    billedFrom,
    billedFromDetails,
    invoiceLogo,
    invoiceSellerPhone,
    invoiceSellerEmail,
    invoiceSellerWebsite,
    invoiceSellerTaxId,
  } = props;

  return (
    <div className="invoice-header" dir="ltr" style={{
      display: 'grid',
      gridTemplateColumns: '1fr minmax(140px, 300px)',
      gap: 24,
      alignItems: 'start',
      width: '100%',
      direction: 'ltr',
    }}>
      <div className="invoice-header__doc" style={{ gridColumn: 1, textAlign: 'left', justifySelf: 'start' }}>
        <h1 style={{ textAlign: 'left', margin: 0 }}>{invoiceTitle}</h1>
        <div className="invoice-meta" style={{ marginTop: 8, textAlign: 'left' }}>
          <div>
            <b>Invoice no.</b> {invoiceRef || '—'}
          </div>
          <div>
            <b>Date</b> {new Date(invoiceIssueDateMs || Date.now()).toLocaleString()}
          </div>
          {invoiceDueDateMs ? (
            <div>
              <b>Due</b> {new Date(invoiceDueDateMs).toLocaleString()}
            </div>
          ) : null}
          {extraMeta}
        </div>
      </div>
      <div
        className="invoice-header__seller seller-block"
        style={{ gridColumn: 2, textAlign: 'right', justifySelf: 'end', width: '100%' }}
      >
        {invoiceLogo ? (
          <img
            src={invoiceLogo}
            alt=""
            style={{
              maxHeight: 56,
              maxWidth: 200,
              objectFit: 'contain',
              objectPosition: 'right center',
              display: 'block',
              marginLeft: 'auto',
              marginRight: 0,
            }}
          />
        ) : null}
        <div className="name">{billedFrom || 'Your Company Name'}</div>
        {billedFromDetails ? <div style={{ whiteSpace: 'pre-line' }}>{billedFromDetails}</div> : null}
        {(invoiceSellerPhone || invoiceSellerEmail || invoiceSellerWebsite) && (
          <div style={{ marginTop: 2 }}>
            {invoiceSellerPhone ? <div>{invoiceSellerPhone}</div> : null}
            {invoiceSellerEmail ? <div>{invoiceSellerEmail}</div> : null}
            {invoiceSellerWebsite ? <div>{invoiceSellerWebsite}</div> : null}
          </div>
        )}
        {invoiceSellerTaxId ? (
          <div style={{ marginTop: 2, color: '#0f172a', fontWeight: 600 }}>Tax / VAT: {invoiceSellerTaxId}</div>
        ) : null}
      </div>
    </div>
  );
}

export function InvoiceBillToBlock({ customer }: { customer: InvoiceCustomerFields }) {
  const person = customerDisplayName(customer);
  return (
    <>
      {person ? (
        <div style={{ fontSize: '10pt', fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>{person}</div>
      ) : null}
      {customer.company && person ? (
        <div style={{ fontSize: '9.5pt', fontWeight: 600, color: '#334155', marginTop: 2 }}>{customer.company}</div>
      ) : customer.company && !person ? (
        <div style={{ fontSize: '10pt', fontWeight: 700, color: '#0f172a' }}>{customer.company}</div>
      ) : null}
      {customer.email ? <div className="small" style={{ marginTop: 4 }}>Email: {customer.email}</div> : null}
      {customer.phone ? <div className="small">Phone: {customer.phone}</div> : null}
      {customer.address ? (
        <div className="small" style={{ whiteSpace: 'pre-line', marginTop: 4 }}>
          {customer.address}
        </div>
      ) : !person && !customer.company && !customer.email && !customer.phone ? (
        <div className="small">—</div>
      ) : null}
    </>
  );
}

export type InvoiceCustomerEditorProps = InvoiceCustomerFields & {
  onChange: (patch: Partial<InvoiceCustomerFields>) => void;
  buyersSlot?: React.ReactNode;
  onSaveBuyer?: () => void;
};

export function InvoiceCustomerEditor({
  firstName,
  lastName,
  company,
  email,
  phone,
  address,
  onChange,
  buyersSlot,
  onSaveBuyer,
}: InvoiceCustomerEditorProps) {
  const inp =
    'w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none';
  const lbl = 'text-[10px] font-bold text-slate-500 uppercase block mb-0.5';

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500 uppercase block">Customer / Bill To</label>
      {buyersSlot}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>First name</label>
          <input className={inp} value={firstName} onChange={(e) => onChange({ firstName: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Last name</label>
          <input className={inp} value={lastName} onChange={(e) => onChange({ lastName: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Company</label>
          <input className={inp} value={company} onChange={(e) => onChange({ company: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Email</label>
          <input type="email" className={inp} value={email} onChange={(e) => onChange({ email: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input type="tel" className={inp} value={phone} onChange={(e) => onChange({ phone: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Address</label>
          <textarea
            rows={3}
            className={`${inp} resize-none`}
            value={address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Street, city, country…"
          />
        </div>
      </div>
      {onSaveBuyer ? (
        <button
          type="button"
          onClick={onSaveBuyer}
          className="w-full text-[11px] font-semibold py-1.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
        >
          ذخیره مشتری در پایگاه داده
        </button>
      ) : null}
    </div>
  );
}
