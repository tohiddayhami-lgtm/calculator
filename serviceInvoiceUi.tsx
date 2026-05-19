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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { computeServiceInvoiceByCurrency, type InvoiceVatMode } from './invoiceAdjustments';
import {
  SERVICE_INVOICE_CURRENCIES,
  createEmptyServiceLine,
  lineFromSavedService,
  normalizeServiceLine,
  savedServiceFromLine,
  serviceLineHasDetailNotes,
  serviceLineInvoiceDescription,
  serviceLineTotal,
  totalsByCurrency,
  type SavedService,
  type ServiceInvoiceLine,
} from './serviceInvoice';
import type { InvoiceExtraCharge } from './types';
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
  invoiceGlobalDiscountMode: 'none' | 'percent' | 'amount';
  setInvoiceGlobalDiscountMode: (m: 'none' | 'percent' | 'amount') => void;
  invoiceGlobalDiscountValue: number;
  setInvoiceGlobalDiscountValue: (v: number) => void;
  serviceInvoiceDiscountCurrency: string;
  setServiceInvoiceDiscountCurrency: (c: string) => void;
  invoiceVatEnabled: boolean;
  setInvoiceVatEnabled: (v: boolean) => void;
  invoiceVatPercent: number;
  setInvoiceVatPercent: (v: number) => void;
  invoiceVatMode: InvoiceVatMode;
  setInvoiceVatMode: (m: InvoiceVatMode) => void;
  invoiceExtraCharges: InvoiceExtraCharge[];
  setInvoiceExtraCharges: React.Dispatch<React.SetStateAction<InvoiceExtraCharge[]>>;
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
    invoiceGlobalDiscountMode,
    setInvoiceGlobalDiscountMode,
    invoiceGlobalDiscountValue,
    setInvoiceGlobalDiscountValue,
    serviceInvoiceDiscountCurrency,
    setServiceInvoiceDiscountCurrency,
    invoiceVatEnabled,
    setInvoiceVatEnabled,
    invoiceVatPercent,
    setInvoiceVatPercent,
    invoiceVatMode,
    setInvoiceVatMode,
    invoiceExtraCharges,
    setInvoiceExtraCharges,
    onManageSellerProfiles,
    sellerProfileSelect,
    buyerSelect,
    onArchiveIssued,
    onArchiveDraft,
  } = props;

  const [pickSavedId, setPickSavedId] = React.useState('');

  const currencyTotals = totalsByCurrency(lines);
  const sortedCurrencies = Object.keys(currencyTotals).sort();

  const currencyOptions = React.useMemo(() => {
    const set = new Set<string>([...SERVICE_INVOICE_CURRENCIES, ...sortedCurrencies]);
    return Array.from(set).sort();
  }, [sortedCurrencies]);

  React.useEffect(() => {
    const disc = (serviceInvoiceDiscountCurrency || defaultCurrency || 'USD').trim().toUpperCase();
    if (sortedCurrencies.length > 0 && !sortedCurrencies.includes(disc)) {
      setServiceInvoiceDiscountCurrency(sortedCurrencies[0]);
    }
  }, [sortedCurrencies, serviceInvoiceDiscountCurrency, defaultCurrency, setServiceInvoiceDiscountCurrency]);

  const adjustments = computeServiceInvoiceByCurrency({
    lines,
    globalDiscountMode: invoiceGlobalDiscountMode,
    globalDiscountValue: invoiceGlobalDiscountValue,
    discountCurrency: serviceInvoiceDiscountCurrency || defaultCurrency || 'USD',
    vatEnabled: invoiceVatEnabled,
    vatPercent: invoiceVatPercent,
    vatMode: invoiceVatMode,
    extraCharges: invoiceExtraCharges,
  });

  const showGlobalDiscount =
    invoiceGlobalDiscountMode !== 'none' && invoiceGlobalDiscountValue > 0;
  const showVat = invoiceVatEnabled && (Number(invoiceVatPercent) || 0) > 0;

  const updateLine = (id: string, patch: Partial<ServiceInvoiceLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const toggleLineDetails = (id: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, detailsOpen: !l.detailsOpen } : l)),
    );
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
            <div className="space-y-2 max-h-72 overflow-y-auto border border-slate-100 rounded-lg p-2">
              {lines.map((line, idx) => {
                const notesOpen = !!line.detailsOpen;
                const hasNotes = serviceLineHasDetailNotes(line);
                return (
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
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, { description: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 mb-1"
                    placeholder="نام / عنوان خدمت"
                  />
                  <button
                    type="button"
                    onClick={() => toggleLineDetails(line.id)}
                    className={`w-full flex items-center justify-center gap-1 py-1 mb-1 rounded border text-[10px] font-semibold transition-colors ${
                      notesOpen || hasNotes
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {notesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    توضیحات {hasNotes && !notesOpen ? '(دارد)' : ''}
                  </button>
                  {notesOpen ? (
                    <textarea
                      rows={3}
                      value={line.detailNotes ?? ''}
                      onChange={(e) => updateLine(line.id, { detailNotes: e.target.value })}
                      className="w-full text-xs border border-indigo-200 rounded px-1.5 py-1 mb-1 bg-indigo-50/40 resize-y min-h-[52px]"
                      placeholder="جزئیات، محدوده کار، شرایط، یادداشت برای مشتری…"
                    />
                  ) : null}
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
                );
              })}
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase">Discounts</p>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Whole invoice</label>
              <select
                value={invoiceGlobalDiscountMode}
                onChange={(e) =>
                  setInvoiceGlobalDiscountMode(e.target.value as 'none' | 'percent' | 'amount')
                }
                className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 mb-1"
              >
                <option value="none">No invoice-level discount</option>
                <option value="percent">Percent (each currency)</option>
                <option value="amount">Fixed amount (one currency)</option>
              </select>
              {invoiceGlobalDiscountMode !== 'none' && (
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={invoiceGlobalDiscountValue || ''}
                  onChange={(e) => setInvoiceGlobalDiscountValue(Number(e.target.value) || 0)}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
                  placeholder={invoiceGlobalDiscountMode === 'percent' ? '%' : 'Amount'}
                />
              )}
            </div>
            {invoiceGlobalDiscountMode === 'amount' && (
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                  Fixed discount currency
                </label>
                <select
                  value={serviceInvoiceDiscountCurrency}
                  onChange={(e) => setServiceInvoiceDiscountCurrency(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
                >
                  {currencyOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-500 mt-1 leading-tight">
                  Percent discount applies to every currency subtotal. Fixed amount subtracts from the currency above only.
                </p>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceVatEnabled}
                onChange={(e) => setInvoiceVatEnabled(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-slate-700 uppercase">VAT / sales tax</span>
            </label>
            {invoiceVatEnabled && (
              <>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                    VAT treatment
                  </label>
                  <select
                    value={invoiceVatMode}
                    onChange={(e) => setInvoiceVatMode(e.target.value as InvoiceVatMode)}
                    className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
                  >
                    <option value="exclusive">Exclusive — VAT added on top</option>
                    <option value="inclusive">Inclusive — prices include VAT</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-slate-500">Rate %</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={invoiceVatPercent || ''}
                    onChange={(e) => setInvoiceVatPercent(Number(e.target.value) || 0)}
                    className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5"
                  />
                </div>
              </>
            )}
            <p className="text-[9px] text-slate-500 leading-tight">
              {invoiceVatMode === 'inclusive'
                ? 'Line totals include VAT; footer shows ex-VAT net and VAT portion per currency.'
                : 'VAT is added on top of net after discount, per currency.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Other charges</span>
              <button
                type="button"
                onClick={() =>
                  setInvoiceExtraCharges((prev) => [
                    ...prev,
                    {
                      id: `ec-${Date.now()}`,
                      label: '',
                      amount: 0,
                      enabled: true,
                      valueMode: 'amount',
                      currency: serviceInvoiceDiscountCurrency || defaultCurrency || 'USD',
                    },
                  ])
                }
                className="text-[10px] font-semibold text-indigo-600 hover:underline"
              >
                + Add
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">
              Fixed amount or percent of net excl. VAT per currency. Added after VAT to the total.
            </p>
            <div className="space-y-1.5">
              {(invoiceExtraCharges || []).map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-1 bg-white border border-slate-100 rounded px-1.5 py-1"
                >
                  <div className="flex flex-wrap items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        setInvoiceExtraCharges((prev) =>
                          prev.map((x) => (x.id === row.id ? { ...x, enabled: e.target.checked } : x))
                        )
                      }
                      className="rounded border-slate-300 text-indigo-600 shrink-0"
                      title="Include in total"
                    />
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) =>
                        setInvoiceExtraCharges((prev) =>
                          prev.map((x) => (x.id === row.id ? { ...x, label: e.target.value } : x))
                        )
                      }
                      placeholder="Label (e.g. Shipping)"
                      className="flex-1 min-w-[72px] text-[11px] border border-slate-200 rounded px-2 py-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setInvoiceExtraCharges((prev) => prev.filter((x) => x.id !== row.id))
                      }
                      className="p-1 text-slate-400 hover:text-red-600 shrink-0"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pl-5">
                    <select
                      value={row.valueMode === 'percent' ? 'percent' : 'amount'}
                      onChange={(e) =>
                        setInvoiceExtraCharges((prev) =>
                          prev.map((x) =>
                            x.id === row.id
                              ? { ...x, valueMode: e.target.value as 'amount' | 'percent' }
                              : x
                          )
                        )
                      }
                      className="text-[10px] border border-slate-200 rounded px-1 py-0.5"
                    >
                      <option value="amount">Amount</option>
                      <option value="percent">%</option>
                    </select>
                    <select
                      value={row.currency || serviceInvoiceDiscountCurrency || defaultCurrency || 'USD'}
                      onChange={(e) =>
                        setInvoiceExtraCharges((prev) =>
                          prev.map((x) => (x.id === row.id ? { ...x, currency: e.target.value } : x))
                        )
                      }
                      className="text-[10px] border border-slate-200 rounded px-1 py-0.5"
                    >
                      {currencyOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={row.amount || ''}
                      onChange={(e) =>
                        setInvoiceExtraCharges((prev) =>
                          prev.map((x) =>
                            x.id === row.id ? { ...x, amount: Number(e.target.value) || 0 } : x
                          )
                        )
                      }
                      placeholder={row.valueMode === 'percent' ? '%' : '0'}
                      className="w-[72px] text-[11px] border border-slate-200 rounded px-2 py-1 text-right"
                    />
                  </div>
                </div>
              ))}
              {(!invoiceExtraCharges || invoiceExtraCharges.length === 0) && (
                <p className="text-[10px] text-slate-400 italic">No extra lines yet.</p>
              )}
            </div>
          </div>

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
          dir="ltr"
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
                        {serviceLineInvoiceDescription(normalizeServiceLine(line)) || '—'}
                      </div>
                    </td>
                    <td className="center">{line.qty}</td>
                    <td className="num">{formatMoney(line.unitPrice, line.currency)}</td>
                    <td className="num line-total">{formatMoney(serviceLineTotal(line), line.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {adjustments.length > 0 && (
              <tfoot>
                {adjustments.map((row) => (
                  <React.Fragment key={row.currency}>
                    <tr className="subtotal">
                      <td colSpan={4} className="num">
                        Subtotal ({row.currency})
                      </td>
                      <td className="num">{formatMoney(row.subtotal, row.currency)}</td>
                    </tr>
                    {showGlobalDiscount && row.discount > 0 && (
                      <tr className="discount">
                        <td colSpan={4} className="num">
                          {invoiceGlobalDiscountMode === 'percent'
                            ? `Discount (${Math.min(100, invoiceGlobalDiscountValue)}%)`
                            : 'Discount (fixed)'}{' '}
                          ({row.currency})
                        </td>
                        <td className="num">−{formatMoney(row.discount, row.currency)}</td>
                      </tr>
                    )}
                    <tr className="net">
                      <td colSpan={4} className="num">
                        {showVat ? 'Net (excl. VAT)' : 'Net'} ({row.currency})
                      </td>
                      <td className="num">
                        {formatMoney(showVat ? row.netExclVat : row.net, row.currency)}
                      </td>
                    </tr>
                    {showVat && (
                      <tr className="vat">
                        <td colSpan={4} className="num">
                          VAT ({Number(invoiceVatPercent)}% ·{' '}
                          {invoiceVatMode === 'inclusive' ? 'inclusive' : 'exclusive'}) ({row.currency})
                        </td>
                        <td className="num">{formatMoney(row.vat, row.currency)}</td>
                      </tr>
                    )}
                    {row.extras.map((ex) => (
                      <tr key={`${row.currency}-${ex.id}`} className="extra">
                        <td colSpan={4} className="num">
                          {ex.label}
                        </td>
                        <td className="num">{formatMoney(ex.amount, row.currency)}</td>
                      </tr>
                    ))}
                    <tr className="total">
                      <td colSpan={4} className="num">
                        TOTAL DUE ({row.currency})
                      </td>
                      <td className="num">{formatMoney(row.grand, row.currency)}</td>
                    </tr>
                  </React.Fragment>
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
