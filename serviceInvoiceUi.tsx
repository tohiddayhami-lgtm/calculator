import React from 'react';
import {
  Archive,
  Building2,
  FileText,
  Plus,
  Printer,
  Save,
  Trash2,
  Layers,
  Package,
} from 'lucide-react';
import {
  SERVICE_INVOICE_CURRENCIES,
  createEmptyServiceLine,
  lineFromSavedService,
  savedServiceFromLine,
  serviceLineTotal,
  totalsByCurrency,
  type SavedService,
  type ServiceInvoiceLine,
} from './serviceInvoice';
import type { InvoiceCustomerFields } from './invoiceCustomer';
import { InvoiceAccentColorPicker, invoiceThemeStyle } from './invoiceTheme';
import { InvoiceBillToBlock, InvoiceCustomerEditor, InvoiceHeaderRow } from './invoiceShared';

export type InvoiceDocKind = 'products' | 'services';

export type ServiceInvoicePanelProps = {
  invoiceDocKind: InvoiceDocKind;
  setInvoiceDocKind: (k: InvoiceDocKind) => void;
  formatMoney: (amount: number, currency: string) => string;
  triggerPrint: () => void;
  onOpenArchive?: () => void;
  archiveCount?: number;
  lines: ServiceInvoiceLine[];
  setLines: React.Dispatch<React.SetStateAction<ServiceInvoiceLine[]>>;
  savedServices: SavedService[];
  setSavedServices: React.Dispatch<React.SetStateAction<SavedService[]>>;
  defaultCurrency: string;
  invoiceTitle: string;
  setInvoiceTitle: (v: string) => void;
  invoiceRef: string;
  setInvoiceRef: (v: string) => void;
  invoiceIssueDateMs: number;
  setInvoiceIssueDateMs: (v: number) => void;
  invoiceDueDateMs?: number;
  setInvoiceDueDateMs: (v: number | undefined) => void;
  formatMsForDatetimeLocal: (ms: number) => string;
  parseDatetimeLocalToMs: (v: string) => number | undefined;
  customerFields: InvoiceCustomerFields;
  onCustomerChange: (patch: Partial<InvoiceCustomerFields>) => void;
  invoiceAccentColor: string;
  onInvoiceAccentColorChange: (c: string) => void;
  renderTextPresetToolbar?: (kind: 'note' | 'paymentTerms' | 'bankDetails') => React.ReactNode;
  buyersSlot?: React.ReactNode;
  onSaveBuyer?: () => void;
  billedFrom: string;
  setBilledFrom: (v: string) => void;
  billedFromDetails: string;
  setBilledFromDetails: (v: string) => void;
  invoiceLogo: string;
  setInvoiceLogo: (v: string) => void;
  invoiceSellerEmail: string;
  setInvoiceSellerEmail: (v: string) => void;
  invoiceSellerPhone: string;
  setInvoiceSellerPhone: (v: string) => void;
  invoiceSellerWebsite: string;
  setInvoiceSellerWebsite: (v: string) => void;
  invoiceSellerTaxId: string;
  setInvoiceSellerTaxId: (v: string) => void;
  paymentTerms: string;
  setPaymentTerms: (v: string) => void;
  bankDetails: string;
  setBankDetails: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  invoiceOrientation: 'portrait' | 'landscape';
  onManageSellerProfiles?: () => void;
  sellerProfileSelect?: React.ReactNode;
  buyerSelect?: React.ReactNode;
  onArchiveIssued?: () => void;
  onArchiveDraft?: () => void;
};

function DocKindTabs({
  kind,
  setKind,
}: {
  kind: InvoiceDocKind;
  setKind: (k: InvoiceDocKind) => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 mb-4">
      <button
        type="button"
        onClick={() => setKind('products')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-all ${
          kind === 'products' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Package className="w-3.5 h-3.5" />
        کالا / Goods
      </button>
      <button
        type="button"
        onClick={() => setKind('services')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-all ${
          kind === 'services' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        خدمات / Services
      </button>
    </div>
  );
}

export function ServiceInvoicePanel(props: ServiceInvoicePanelProps) {
  const {
    invoiceDocKind,
    setInvoiceDocKind,
    formatMoney,
    triggerPrint,
    onOpenArchive,
    archiveCount = 0,
    lines,
    setLines,
    savedServices,
    setSavedServices,
    defaultCurrency,
    invoiceTitle,
    setInvoiceTitle,
    invoiceRef,
    setInvoiceRef,
    invoiceIssueDateMs,
    setInvoiceIssueDateMs,
    invoiceDueDateMs,
    setInvoiceDueDateMs,
    formatMsForDatetimeLocal,
    parseDatetimeLocalToMs,
    customerFields,
    onCustomerChange,
    invoiceAccentColor,
    onInvoiceAccentColorChange,
    renderTextPresetToolbar,
    buyersSlot,
    onSaveBuyer,
    billedFrom,
    setBilledFrom,
    billedFromDetails,
    setBilledFromDetails,
    invoiceLogo,
    invoiceSellerEmail,
    invoiceSellerPhone,
    invoiceSellerWebsite,
    invoiceSellerTaxId,
    paymentTerms,
    setPaymentTerms,
    bankDetails,
    setBankDetails,
    notes,
    setNotes,
    invoiceOrientation,
    onManageSellerProfiles,
    sellerProfileSelect,
    buyerSelect,
    onArchiveIssued,
    onArchiveDraft,
  } = props;

  const [pickSavedId, setPickSavedId] = React.useState('');

  const currencyTotals = totalsByCurrency(lines);
  const sortedCurrencies = Object.keys(currencyTotals).sort();

  const updateLine = (id: string, patch: Partial<ServiceInvoiceLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyServiceLine(defaultCurrency)]);
  };

  const addFromSaved = () => {
    const svc = savedServices.find((s) => s.id === pickSavedId);
    if (!svc) return;
    setLines((prev) => [...prev, lineFromSavedService(svc, defaultCurrency)]);
    setPickSavedId('');
  };

  const saveLineToLibrary = (line: ServiceInvoiceLine) => {
    const svc = savedServiceFromLine(line);
    if (!svc) {
      alert('ابتدا شرح خدمت را وارد کنید.');
      return;
    }
    setSavedServices((prev) => {
      const existing = line.savedServiceId ? prev.find((s) => s.id === line.savedServiceId) : null;
      if (existing) {
        return prev.map((s) =>
          s.id === existing.id
            ? {
                ...s,
                name: svc.name,
                description: svc.description,
                defaultUnitPrice: svc.defaultUnitPrice,
                defaultCurrency: svc.defaultCurrency,
                updatedAt: Date.now(),
              }
            : s
        );
      }
      updateLine(line.id, { savedServiceId: svc.id });
      return [svc, ...prev];
    });
  };

  const deleteSaved = (id: string) => {
    if (!window.confirm('این خدمت از کتابخانه حذف شود؟')) return;
    setSavedServices((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto print:hidden">
        <DocKindTabs kind={invoiceDocKind} setKind={setInvoiceDocKind} />

        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> Service Invoice
          </h3>
          {onOpenArchive && (
            <button
              type="button"
              onClick={onOpenArchive}
              className="relative text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
              {archiveCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold bg-white text-slate-900 rounded px-1.5 py-0.5">
                  {archiveCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Document Title</label>
            <input
              type="text"
              value={invoiceTitle}
              onChange={(e) => setInvoiceTitle(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
              placeholder="Service Proforma Invoice"
            />
          </div>
          <InvoiceAccentColorPicker value={invoiceAccentColor} onChange={onInvoiceAccentColorChange} />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Invoice #</label>
            <input
              type="text"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Issue date</label>
              <input
                type="datetime-local"
                value={formatMsForDatetimeLocal(
                  Number.isFinite(invoiceIssueDateMs) && invoiceIssueDateMs > 0 ? invoiceIssueDateMs : Date.now()
                )}
                onChange={(e) => {
                  const ms = parseDatetimeLocalToMs(e.target.value);
                  if (ms !== undefined) setInvoiceIssueDateMs(ms);
                }}
                className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Due date (optional)</label>
              <input
                type="datetime-local"
                value={invoiceDueDateMs ? formatMsForDatetimeLocal(invoiceDueDateMs) : ''}
                onChange={(e) => {
                  const ms = parseDatetimeLocalToMs(e.target.value);
                  setInvoiceDueDateMs(ms);
                }}
                className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg space-y-2">
            <p className="text-xs font-bold text-indigo-800 uppercase">Service lines</p>
            <p className="text-[10px] text-indigo-700 leading-snug">
              هر ردیف می‌تواند ارز جدا داشته باشد. جمع‌ها در پایین فاکتور به تفکیک ارز نمایش داده می‌شوند.
            </p>
            <button
              type="button"
              onClick={addLine}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add service line
            </button>
            {savedServices.length > 0 && (
              <div className="flex gap-1">
                <select
                  value={pickSavedId}
                  onChange={(e) => setPickSavedId(e.target.value)}
                  className="flex-1 text-xs border border-indigo-200 rounded px-2 py-1.5 bg-white"
                >
                  <option value="">— از کتابخانه —</option>
                  {savedServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.defaultCurrency ? ` (${s.defaultCurrency})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!pickSavedId}
                  onClick={addFromSaved}
                  className="px-2 py-1.5 text-xs font-semibold border border-indigo-300 rounded bg-white text-indigo-800 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-2">
              {lines.map((line, idx) => (
                <div key={line.id} className="text-[10px] border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between gap-1 mb-1">
                    <span className="font-semibold text-slate-600">#{idx + 1}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => saveLineToLibrary(line)}
                        className="text-indigo-600 hover:underline"
                        title="Save to service library"
                      >
                        <Save className="w-3 h-3 inline" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="text-red-600"
                        title="Remove line"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={line.description}
                    onChange={(e) => updateLine(line.id, { description: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 mb-1"
                    placeholder="Service description"
                  />
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={line.qty || ''}
                      onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) || 0 })}
                      className="text-xs border border-slate-200 rounded px-1 py-0.5"
                      title="Qty"
                    />
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={line.unitPrice || ''}
                      onChange={(e) => updateLine(line.id, { unitPrice: Number(e.target.value) || 0 })}
                      className="text-xs border border-slate-200 rounded px-1 py-0.5"
                      title="Unit price"
                    />
                    <select
                      value={line.currency}
                      onChange={(e) => updateLine(line.id, { currency: e.target.value })}
                      className="text-xs border border-slate-200 rounded px-1 py-0.5"
                    >
                      {SERVICE_INVOICE_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {savedServices.length > 0 && (
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Saved services ({savedServices.length})</p>
              <ul className="space-y-1 max-h-28 overflow-y-auto">
                {savedServices.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="truncate text-slate-700">{s.name}</span>
                    <button type="button" onClick={() => deleteSaved(s.id)} className="text-red-500 shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <hr className="border-slate-100" />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase">Seller</span>
              </div>
              {onManageSellerProfiles && (
                <button
                  type="button"
                  onClick={onManageSellerProfiles}
                  className="text-[10px] font-semibold text-slate-600 hover:text-blue-700 underline"
                >
                  Profiles
                </button>
              )}
            </div>
            {sellerProfileSelect}
            <input
              type="text"
              value={billedFrom}
              onChange={(e) => setBilledFrom(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
              placeholder="Company name"
            />
            <textarea
              rows={2}
              value={billedFromDetails}
              onChange={(e) => setBilledFromDetails(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none"
              placeholder="Address"
            />
          </div>

          {buyerSelect}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Payment terms</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mb-1"
            />
            {renderTextPresetToolbar?.('paymentTerms')}
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1 mt-2">Bank details</label>
            <textarea
              rows={3}
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none mb-1"
            />
            {renderTextPresetToolbar?.('bankDetails')}
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1 mt-2">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none mb-1"
            />
            {renderTextPresetToolbar?.('note')}
          </div>

          <InvoiceCustomerEditor
            {...customerFields}
            onChange={onCustomerChange}
            buyersSlot={buyersSlot}
            onSaveBuyer={onSaveBuyer}
          />

          <div className="space-y-2 mt-2">
            {onArchiveIssued && (
              <button
                type="button"
                onClick={onArchiveIssued}
                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Archive className="w-4 h-4" /> Save to archive (Issued)
              </button>
            )}
            <button
              type="button"
              onClick={triggerPrint}
              className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Invoice
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 bg-slate-200/60 overflow-y-auto p-4 md:p-6 rounded-lg border border-slate-200 print:p-0 print:border-0 print:bg-white print:overflow-visible"
        id="invoice-preview"
      >
        <div
          className={`invoice-doc shadow-md mx-auto print:shadow-none invoice-doc--portrait ${
            invoiceOrientation === 'landscape' ? 'invoice-landscape-page invoice-doc--landscape' : ''
          }`}
          style={{ display: 'flex', flexDirection: 'column', ...invoiceThemeStyle(invoiceAccentColor) }}
        >
          <InvoiceHeaderRow
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
              <div style={{ fontSize: '9.5pt', fontWeight: 600, color: '#0f172a' }}>{paymentTerms || '—'}</div>
            </div>
          </div>

          <table className="items">
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                <th>Service Description</th>
                <th className="center" style={{ width: 56 }}>
                  Qty
                </th>
                <th className="num" style={{ width: 100 }}>
                  Unit Price
                </th>
                <th className="num" style={{ width: 96 }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="center muted" style={{ padding: 16, color: '#94a3b8' }}>
                    No service lines — add services in the panel on the left
                  </td>
                </tr>
              ) : (
                lines.map((line, i) => (
                  <tr key={line.id}>
                    <td className="center">{i + 1}</td>
                    <td className="item-cell">
                      <div className="name" style={{ whiteSpace: 'pre-line' }}>
                        {line.description || '—'}
                      </div>
                    </td>
                    <td className="center">{line.qty}</td>
                    <td className="num">{formatMoney(line.unitPrice, line.currency)}</td>
                    <td className="num line-total">{formatMoney(serviceLineTotal(line), line.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {sortedCurrencies.length > 0 && (
              <tfoot>
                {sortedCurrencies.map((ccy) => (
                  <tr key={ccy} className="total">
                    <td colSpan={4} className="num">
                      Subtotal ({ccy})
                    </td>
                    <td className="num">{formatMoney(currencyTotals[ccy] || 0, ccy)}</td>
                  </tr>
                ))}
              </tfoot>
            )}
          </table>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: invoiceOrientation === 'landscape' ? '1.2fr 1.2fr 0.9fr' : '1fr 1fr',
              gap: 12,
              marginTop: 14,
            }}
          >
            <div className="info-card">
              <h3>Payment Details</h3>
              <div className="small" style={{ whiteSpace: 'pre-line', color: '#1e293b', lineHeight: 1.5 }}>
                {bankDetails || '—'}
              </div>
            </div>
            <div className="info-card">
              <h3>Notes / Terms</h3>
              <div className="small" style={{ whiteSpace: 'pre-line', color: '#1e293b', lineHeight: 1.5 }}>
                {notes || '—'}
              </div>
            </div>
            <div className="info-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3>Authorized Signature</h3>
              <div className="signature-line" style={{ marginTop: 'auto' }} />
              <div
                className="small"
                style={{
                  marginTop: 4,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  fontSize: '7pt',
                }}
              >
                {billedFrom || 'Seller'}
              </div>
            </div>
          </div>

          <div className="doc-footer">
            Generated by Tohid Dayhami Export⁺ — issued {new Date(invoiceIssueDateMs || Date.now()).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tabs only — embed at top of product invoice sidebar */
export function InvoiceDocKindTabs({
  kind,
  setKind,
}: {
  kind: InvoiceDocKind;
  setKind: (k: InvoiceDocKind) => void;
}) {
  return <DocKindTabs kind={kind} setKind={setKind} />;
}
