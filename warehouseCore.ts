import type {
  Product,
  WarehouseLocation,
  WarehouseMovement,
  WarehouseMovementType,
  WarehouseProductSettings,
} from './types';

export type WarehouseReasonOption = { id: string; label: string };

export const WAREHOUSE_IN_REASONS: WarehouseReasonOption[] = [
  { id: 'purchase', label: 'خرید / ورود کالا' },
  { id: 'return_customer', label: 'برگشت از مشتری' },
  { id: 'transfer_in', label: 'انتقال به انبار' },
  { id: 'production', label: 'تولید / مونتاژ' },
  { id: 'opening', label: 'موجودی اول دوره' },
  { id: 'adjustment_in', label: 'اصلاح افزایشی' },
  { id: 'other_in', label: 'سایر (ورود)' },
];

export const WAREHOUSE_OUT_REASONS: WarehouseReasonOption[] = [
  { id: 'sale', label: 'فروش / خروج' },
  { id: 'export_shipment', label: 'ارسال صادراتی' },
  { id: 'damage', label: 'ضایعات / خرابی' },
  { id: 'sample', label: 'نمونه' },
  { id: 'transfer_out', label: 'انتقال از انبار' },
  { id: 'adjustment_out', label: 'اصلاح کاهشی' },
  { id: 'other_out', label: 'سایر (خروج)' },
];

export function newWarehouseId(prefix = 'wh'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultWarehouseLocations(): WarehouseLocation[] {
  const now = Date.now();
  return [
    {
      id: 'wh_main',
      name: 'انبار اصلی',
      code: 'MAIN',
      isDefault: true,
      createdAt: now,
    },
  ];
}

export function warehouseLabel(locations: WarehouseLocation[], id: string): string {
  const w = locations.find((x) => x.id === id);
  return w?.name?.trim() || w?.code || id;
}

export function resolveDefaultWarehouseId(locations: WarehouseLocation[]): string {
  if (!locations.length) return 'wh_main';
  return locations.find((w) => w.isDefault)?.id || locations[0].id;
}

export function stockOnHand(
  movements: WarehouseMovement[],
  productId: number,
  warehouseId: string,
): number {
  let n = 0;
  for (const m of movements) {
    if (m.productId !== productId || m.warehouseId !== warehouseId) continue;
    if (m.type === 'in') n += m.qty;
    else if (m.type === 'out') n -= m.qty;
    else n = m.qtyAfter;
  }
  return Math.max(0, Math.round(n * 1000) / 1000);
}

export function stockTotalAllWarehouses(
  movements: WarehouseMovement[],
  productId: number,
): number {
  const ids = new Set(
    movements.filter((m) => m.productId === productId).map((m) => m.warehouseId),
  );
  let sum = 0;
  for (const wid of ids) sum += stockOnHand(movements, productId, wid);
  return Math.round(sum * 1000) / 1000;
}

export function minStockForProduct(
  settings: WarehouseProductSettings[],
  productId: number,
): number | undefined {
  const s = settings.find((x) => x.productId === productId);
  const m = s?.minStock;
  return typeof m === 'number' && Number.isFinite(m) && m > 0 ? m : undefined;
}

export type StockStatus = 'ok' | 'low' | 'out';

export function stockStatus(onHand: number, minStock?: number): StockStatus {
  if (onHand <= 0) return 'out';
  if (minStock !== undefined && onHand <= minStock) return 'low';
  return 'ok';
}

export function reasonLabel(reasonId: string, type: WarehouseMovementType): string {
  const list = type === 'in' ? WAREHOUSE_IN_REASONS : type === 'out' ? WAREHOUSE_OUT_REASONS : [...WAREHOUSE_IN_REASONS, ...WAREHOUSE_OUT_REASONS];
  return list.find((r) => r.id === reasonId)?.label || reasonId || '—';
}

export type MovementValidation =
  | { ok: true; qty: number; qtyBefore: number; qtyAfter: number }
  | { ok: false; message: string };

export function validateMovement(params: {
  type: WarehouseMovementType;
  qtyInput: number;
  qtyBefore: number;
  targetQty?: number;
}): MovementValidation {
  const before = Math.max(0, params.qtyBefore);
  const { type } = params;

  if (type === 'adjustment') {
    const target = params.targetQty;
    if (target === undefined || !Number.isFinite(target) || target < 0) {
      return { ok: false, message: 'موجودی هدف را وارد کنید.' };
    }
    const after = Math.round(target * 1000) / 1000;
    const delta = Math.abs(after - before);
    if (delta === 0) return { ok: false, message: 'موجودی تغییری نکرده است.' };
    return { ok: true, qty: delta, qtyBefore: before, qtyAfter: after };
  }

  const qty = Math.round(Math.max(0, params.qtyInput) * 1000) / 1000;
  if (qty <= 0) return { ok: false, message: 'مقدار باید بزرگ‌تر از صفر باشد.' };

  if (type === 'in') {
    const after = before + qty;
    return { ok: true, qty, qtyBefore: before, qtyAfter: after };
  }

  if (type === 'out') {
    if (qty > before) {
      return { ok: false, message: `موجودی کافی نیست. موجودی فعلی: ${before}` };
    }
    const after = before - qty;
    return { ok: true, qty, qtyBefore: before, qtyAfter: after };
  }

  return { ok: false, message: 'نوع حرکت نامعتبر است.' };
}

export function buildMovement(params: {
  productId: number;
  warehouseId: string;
  type: WarehouseMovementType;
  reason: string;
  note?: string;
  reference?: string;
  validation: Extract<MovementValidation, { ok: true }>;
}): WarehouseMovement {
  return {
    id: newWarehouseId('wm'),
    productId: params.productId,
    warehouseId: params.warehouseId,
    type: params.type,
    qty: params.validation.qty,
    qtyBefore: params.validation.qtyBefore,
    qtyAfter: params.validation.qtyAfter,
    reason: params.reason,
    note: params.note?.trim() || undefined,
    reference: params.reference?.trim() || undefined,
    createdAt: Date.now(),
  };
}

export function productDisplayName(p: Product): string {
  return (p.catalogName || p.name || '').trim() || `محصول #${p.id}`;
}

export function productSku(p: Product): string {
  return (p.sku || '').trim() || `ID-${p.id}`;
}

export function formatStockQty(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}
