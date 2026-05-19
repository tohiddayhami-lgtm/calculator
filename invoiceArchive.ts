import { computeServiceInvoiceByCurrency, normalizeInvoiceVatMode } from './invoiceAdjustments';
import {
  normalizeServiceLine,
  serviceLineTotal,
  type ServiceInvoiceDecimalPlaces,
  type ServiceInvoiceLine,
} from './serviceInvoice';
import type {
  ArchivedInvoice,
  ArchivedInvoiceKind,
  ArchivedServiceLineSnapshot,
  BuyerCustomerKind,
  InvoiceExtraCharge,
} from './types';
import type { InvoiceVatMode } from './invoiceAdjustments';

export function normalizeArchivedInvoiceKind(raw: unknown): ArchivedInvoiceKind {
  return raw === 'services' ? 'services' : 'products';
}

export function archivedInvoiceKindLabel(kind: ArchivedInvoiceKind): string {
  return kind === 'services' ? 'خدمات' : 'صادرات / کالا';
}

/** Old bug: service invoice archived with export product lines and huge totalDue. */
export function isLegacyMisarchivedServiceInvoice(inv: ArchivedInvoice): boolean {
  const n = normalizeArchivedInvoice(inv);
  if (n.customerKind !== 'services') return false;
  if (normalizeArchivedInvoiceKind(n.invoiceKind) === 'services') return false;
  if ((n.serviceLines?.length ?? 0) > 0) return false;
  return (n.items?.length ?? 0) > 0;
}

export function normalizeArchivedInvoice(inv: ArchivedInvoice): ArchivedInvoice {
  const invoiceKind = normalizeArchivedInvoiceKind(inv.invoiceKind);
  return {
    ...inv,
    invoiceKind,
    customerKind: inv.customerKind === 'services' ? 'services' : 'export',
    items: inv.items ?? [],
    serviceLines: inv.serviceLines ?? [],
    serviceGrandByCurrency: inv.serviceGrandByCurrency ?? {},
    subtotalByTerm: inv.subtotalByTerm ?? {},
    netAfterGlobalByTerm: inv.netAfterGlobalByTerm ?? {},
    vatByTerm: inv.vatByTerm ?? {},
    grandByTerm: inv.grandByTerm ?? {},
    payments: inv.payments ?? [],
  };
}

export type BuildServiceArchiveParams = {
  status: ArchivedInvoice['status'];
  customerName: string;
  customerAddress: string;
  customerKind: BuyerCustomerKind;
  invoiceRef: string;
  invoiceTitle: string;
  issueDateMs: number;
  dueDateMs?: number;
  billedFrom: string;
  billedFromDetails: string;
  invoiceLogo: string;
  invoiceSellerEmail: string;
  invoiceSellerPhone: string;
  invoiceSellerWebsite: string;
  invoiceSellerTaxId: string;
  paymentTerms: string;
  bankDetails: string;
  notes: string;
  invoiceAccentColor?: string;
  lines: ServiceInvoiceLine[];
  globalDiscountMode: 'none' | 'percent' | 'amount';
  globalDiscountValue: number;
  discountCurrency: string;
  vatEnabled: boolean;
  vatPercent: number;
  vatMode: InvoiceVatMode;
  extraCharges: InvoiceExtraCharge[];
  decimalPlaces: ServiceInvoiceDecimalPlaces;
  projectId: string;
};

/** Build archive payload for service proforma (not export product lines). */
export function buildServiceArchiveSnapshot(
  params: BuildServiceArchiveParams,
): Omit<ArchivedInvoice, 'id'> | null {
  const activeLines = params.lines.filter((l) => {
    const n = normalizeServiceLine(l);
    return n.description.trim() || String(n.detailNotes ?? '').trim();
  });
  if (!activeLines.length) {
    return null;
  }

  const adjustments = computeServiceInvoiceByCurrency({
    lines: activeLines,
    globalDiscountMode: params.globalDiscountMode,
    globalDiscountValue: params.globalDiscountValue,
    discountCurrency: params.discountCurrency,
    vatEnabled: params.vatEnabled,
    vatPercent: params.vatPercent,
    vatMode: params.vatMode,
    extraCharges: params.extraCharges,
    decimalPlaces: params.decimalPlaces,
  });

  if (!adjustments.length) {
    return null;
  }

  const serviceGrandByCurrency: Record<string, number> = {};
  const subtotalByTerm: Record<string, number> = {};
  const netAfterGlobalByTerm: Record<string, number> = {};
  const vatByTerm: Record<string, number> = {};
  const grandByTerm: Record<string, number> = {};

  for (const row of adjustments) {
    serviceGrandByCurrency[row.currency] = row.grand;
    subtotalByTerm[row.currency] = row.subtotal;
    netAfterGlobalByTerm[row.currency] = row.net;
    vatByTerm[row.currency] = row.vat;
    grandByTerm[row.currency] = row.grand;
  }

  const primaryCurrency =
    (params.discountCurrency || '').trim().toUpperCase() ||
    adjustments[0].currency ||
    'USD';
  const primaryRow =
    adjustments.find((r) => r.currency === primaryCurrency) || adjustments[0];

  const serviceLines: ArchivedServiceLineSnapshot[] = activeLines.map((line) => {
    const n = normalizeServiceLine(line);
    return {
      lineId: line.id,
      description: n.description,
      detailNotes: n.detailNotes,
      qty: line.qty,
      unitPrice: line.unitPrice,
      currency: (line.currency || primaryCurrency).trim().toUpperCase() || primaryCurrency,
      lineTotal: serviceLineTotal(line, params.decimalPlaces),
    };
  });

  const vatMode = normalizeInvoiceVatMode(params.vatMode);

  return {
    invoiceKind: 'services',
    customerKind: params.customerKind === 'services' ? 'services' : 'export',
    invoiceRef: params.invoiceRef || `SVC-${Date.now()}`,
    invoiceTitle: params.invoiceTitle || 'Service Proforma Invoice',
    issueDate:
      Number.isFinite(params.issueDateMs) && params.issueDateMs > 0 ? params.issueDateMs : Date.now(),
    dueDate: params.dueDateMs,
    status: params.status,
    customerName: params.customerName,
    customerAddress: params.customerAddress,
    selectedTerm: primaryCurrency,
    invoiceTerms: adjustments.map((r) => r.currency),
    invoiceBasis: 'unit',
    showImages: false,
    outputCurrency: primaryCurrency,

    billedFrom: params.billedFrom,
    billedFromDetails: params.billedFromDetails,
    invoiceLogo: params.invoiceLogo || '',
    invoiceSellerEmail: params.invoiceSellerEmail,
    invoiceSellerPhone: params.invoiceSellerPhone,
    invoiceSellerWebsite: params.invoiceSellerWebsite,
    invoiceSellerTaxId: params.invoiceSellerTaxId,
    paymentTerms: params.paymentTerms,
    bankDetails: params.bankDetails,
    notes: params.notes,

    invoiceDiscountBaseTerm: primaryCurrency,
    invoiceGlobalDiscountMode: params.globalDiscountMode,
    invoiceGlobalDiscountValue: params.globalDiscountValue,
    invoiceVatEnabled: params.vatEnabled,
    invoiceVatPercent: params.vatPercent,
    invoiceVatMode: vatMode,
    invoiceExtraCharges: params.extraCharges,
    extrasTotal: primaryRow.extras.reduce((s, e) => s + e.amount, 0),

    items: [],
    serviceLines,
    serviceGrandByCurrency,
    subtotalByTerm,
    netAfterGlobalByTerm,
    vatByTerm,
    grandByTerm,
    totalDue: primaryRow.grand,
    payments: [],
    projectId: params.projectId || '',
  };
}

export function serviceLineDescriptionDisplay(line: ArchivedServiceLineSnapshot): string {
  const title = line.description.trim();
  const notes = String(line.detailNotes ?? '').trim();
  if (title && notes) return `${title}\n${notes}`;
  return title || notes;
}

/** Match archived invoices to current editor customer (name) and optional kind. */
export function archivedInvoicesForCustomer(
  list: ArchivedInvoice[],
  customerName: string,
  kind?: ArchivedInvoiceKind,
): ArchivedInvoice[] {
  const q = customerName.trim().toLowerCase();
  if (!q) return [];
  return list.filter((inv) => {
    const n = normalizeArchivedInvoice(inv);
    if (kind && normalizeArchivedInvoiceKind(n.invoiceKind) !== kind) return false;
    return (n.customerName || '').trim().toLowerCase() === q;
  });
}

export function summarizeCustomerBalances(
  list: ArchivedInvoice[],
  kind?: ArchivedInvoiceKind,
): { totalDue: number; paid: number; balance: number; currency: string; count: number }[] {
  const filtered = kind
    ? list.map(normalizeArchivedInvoice).filter((i) => i.invoiceKind === kind)
    : list.map(normalizeArchivedInvoice);

  const byCcy: Record<string, { totalDue: number; paid: number; count: number }> = {};
  for (const inv of filtered) {
    if (inv.status === 'cancelled') continue;
    if (isLegacyMisarchivedServiceInvoice(inv)) continue;
    const ccy = (inv.outputCurrency || 'USD').trim().toUpperCase() || 'USD';
    if (!byCcy[ccy]) byCcy[ccy] = { totalDue: 0, paid: 0, count: 0 };
    byCcy[ccy].totalDue += inv.totalDue || 0;
    const paid = (inv.payments ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    byCcy[ccy].paid += paid;
    byCcy[ccy].count += 1;
  }
  return Object.entries(byCcy).map(([currency, v]) => ({
    currency,
    totalDue: v.totalDue,
    paid: v.paid,
    balance: Math.max(0, v.totalDue - v.paid),
    count: v.count,
  }));
}
