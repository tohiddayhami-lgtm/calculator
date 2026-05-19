import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ClipboardList,
  Download,
  History,
  Package,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react';
import type {
  Product,
  Supplier,
  WarehouseLocation,
  WarehouseMovement,
  WarehouseMovementType,
  WarehouseProductSettings,
} from './types';
import { formatThousandsWhileTyping, parseFormattedNumber } from './numericInputFormat';
import {
  buildMovement,
  defaultWarehouseLocations,
  formatStockQty,
  minStockForProduct,
  newWarehouseId,
  productDisplayName,
  productSku,
  reasonLabel,
  resolveDefaultWarehouseId,
  stockOnHand,
  stockStatus,
  stockTotalAllWarehouses,
  validateMovement,
  WAREHOUSE_IN_REASONS,
  WAREHOUSE_OUT_REASONS,
  type StockStatus,
} from './warehouseCore';

export type WarehousePanelProps = {
  products: Product[];
  suppliers: Supplier[];
  locations: WarehouseLocation[];
  setLocations: React.Dispatch<React.SetStateAction<WarehouseLocation[]>>;
  movements: WarehouseMovement[];
  setMovements: React.Dispatch<React.SetStateAction<WarehouseMovement[]>>;
  productSettings: WarehouseProductSettings[];
  setProductSettings: React.Dispatch<React.SetStateAction<WarehouseProductSettings[]>>;
};

type TabId = 'stock' | 'movements' | 'warehouses';
type StockFilter = 'all' | 'instock' | 'low' | 'out';
type MovementDraft = {
  productId: number;
  warehouseId: string;
  type: WarehouseMovementType;
  reason: string;
  qtyText: string;
  targetQtyText: string;
  note: string;
  reference: string;
};

function statusBadge(status: StockStatus): { label: string; cls: string } {
  if (status === 'low') return { label: 'کمبود', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (status === 'out') return { label: 'ناموجود', cls: 'bg-red-100 text-red-800 border-red-200' };
  return { label: 'عادی', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
}

function movementTypeLabel(t: WarehouseMovementType): string {
  if (t === 'in') return 'ورود';
  if (t === 'out') return 'خروج';
  return 'اصلاح';
}

function emptyDraft(warehouseId: string, productId = 0): MovementDraft {
  return {
    productId,
    warehouseId,
    type: 'in',
    reason: WAREHOUSE_IN_REASONS[0].id,
    qtyText: '',
    targetQtyText: '',
    note: '',
    reference: '',
  };
}

export function WarehousePanel({
  products,
  suppliers,
  locations,
  setLocations,
  movements,
  setMovements,
  productSettings,
  setProductSettings,
}: WarehousePanelProps) {
  const [tab, setTab] = useState<TabId>('stock');
  const [warehouseFilterId, setWarehouseFilterId] = useState<string>(() =>
    resolveDefaultWarehouseId(locations),
  );
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [movementModal, setMovementModal] = useState<MovementDraft | null>(null);
  const [movementError, setMovementError] = useState('');
  const [histProductId, setHistProductId] = useState<number | ''>('');
  const [histType, setHistType] = useState<WarehouseMovementType | 'all'>('all');
  const [warehouseForm, setWarehouseForm] = useState<{ id?: string; name: string; code: string; notes: string } | null>(
    null,
  );

  const defaultWh = resolveDefaultWarehouseId(locations);
  const activeWh = warehouseFilterId || defaultWh;

  const supplierName = (id?: number) => {
    if (!id) return '';
    const s = suppliers.find((x) => x.id === id);
    return s?.companyName || s?.name || '';
  };

  const catalogProducts = useMemo(
    () => products.filter((p) => (p.name || '').trim() || (p.sku || '').trim()),
    [products],
  );

  const stockRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogProducts
      .map((p) => {
        const onHand = stockOnHand(movements, p.id, activeWh);
        const totalAll = stockTotalAllWarehouses(movements, p.id);
        const min = minStockForProduct(productSettings, p.id);
        const status = stockStatus(onHand, min);
        return {
          product: p,
          onHand,
          totalAll,
          min,
          status,
          unit: (p.measurementUnit || 'pcs').trim() || 'pcs',
        };
      })
      .filter((row) => {
        if (stockFilter === 'instock' && row.onHand <= 0) return false;
        if (stockFilter === 'out' && row.status !== 'out') return false;
        if (stockFilter === 'low' && row.status !== 'low') return false;
        if (!q) return true;
        const hay = `${productSku(row.product)} ${productDisplayName(row.product)} ${row.product.group || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const order: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 };
        const d = order[a.status] - order[b.status];
        if (d !== 0) return d;
        return productDisplayName(a.product).localeCompare(productDisplayName(b.product), 'fa');
      });
  }, [catalogProducts, movements, activeWh, productSettings, search, stockFilter]);

  const stats = useMemo(() => {
    let skus = 0;
    let units = 0;
    let low = 0;
    let out = 0;
    for (const p of catalogProducts) {
      const onHand = stockOnHand(movements, p.id, activeWh);
      if (onHand > 0) {
        skus += 1;
        units += onHand;
      }
      const min = minStockForProduct(productSettings, p.id);
      const st = stockStatus(onHand, min);
      if (st === 'low') low += 1;
      if (st === 'out') out += 1;
    }
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const movesMonth = movements.filter((m) => m.createdAt >= monthStart.getTime()).length;
    return { skus, units, low, out, movesMonth };
  }, [catalogProducts, movements, activeWh, productSettings]);

  const historyRows = useMemo(() => {
    return [...movements]
      .filter((m) => {
        if (histProductId !== '' && m.productId !== histProductId) return false;
        if (histType !== 'all' && m.type !== histType) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200);
  }, [movements, histProductId, histType]);

  const openMovement = (type: WarehouseMovementType, productId: number) => {
    const before = stockOnHand(movements, productId, activeWh);
    setMovementError('');
    setMovementModal({
      ...emptyDraft(activeWh, productId),
      type,
      reason: type === 'in' ? WAREHOUSE_IN_REASONS[0].id : type === 'out' ? WAREHOUSE_OUT_REASONS[0].id : 'adjustment_in',
      targetQtyText: type === 'adjustment' ? String(before) : '',
    });
  };

  const submitMovement = () => {
    if (!movementModal) return;
    const productId = movementModal.productId;
    if (!productId) {
      setMovementError('محصول را انتخاب کنید.');
      return;
    }
    const before = stockOnHand(movements, productId, movementModal.warehouseId);
    const qtyInput = parseFormattedNumber(movementModal.qtyText);
    const targetQty =
      movementModal.type === 'adjustment'
        ? parseFormattedNumber(movementModal.targetQtyText)
        : undefined;

    const validation = validateMovement({
      type: movementModal.type,
      qtyInput,
      qtyBefore: before,
      targetQty,
    });
    if (!validation.ok) {
      setMovementError(validation.message);
      return;
    }

    const mov = buildMovement({
      productId,
      warehouseId: movementModal.warehouseId,
      type: movementModal.type,
      reason: movementModal.reason,
      note: movementModal.note,
      reference: movementModal.reference,
      validation,
    });
    setMovements((prev) => [...prev, mov]);
    setMovementModal(null);
    setMovementError('');
  };

  const setMinStock = (productId: number, raw: string) => {
    const n = parseFormattedNumber(raw);
    setProductSettings((prev) => {
      const rest = prev.filter((x) => x.productId !== productId);
      if (n <= 0) return rest;
      return [...rest, { productId, minStock: n }];
    });
  };

  const saveWarehouseForm = () => {
    if (!warehouseForm) return;
    const name = warehouseForm.name.trim();
    if (!name) return;
    if (warehouseForm.id) {
      setLocations((prev) =>
        prev.map((w) =>
          w.id === warehouseForm.id
            ? {
                ...w,
                name,
                code: warehouseForm.code.trim() || undefined,
                notes: warehouseForm.notes.trim() || undefined,
              }
            : w,
        ),
      );
    } else {
      setLocations((prev) => [
        ...prev,
        {
          id: newWarehouseId('wh'),
          name,
          code: warehouseForm.code.trim() || undefined,
          notes: warehouseForm.notes.trim() || undefined,
          createdAt: Date.now(),
        },
      ]);
    }
    setWarehouseForm(null);
  };

  const deleteWarehouse = (id: string) => {
    const used = movements.some((m) => m.warehouseId === id);
    if (used) {
      alert('این انبار در گردش موجودی استفاده شده و قابل حذف نیست.');
      return;
    }
    if (locations.length <= 1) {
      alert('حداقل یک انبار باید باقی بماند.');
      return;
    }
    setLocations((prev) => prev.filter((w) => w.id !== id));
    if (warehouseFilterId === id) setWarehouseFilterId(resolveDefaultWarehouseId(locations.filter((w) => w.id !== id)));
  };

  const exportStockCsv = () => {
    const headers = ['SKU', 'Product', 'Group', 'Unit', 'Warehouse', 'On hand', 'Min stock', 'Status'];
    const whName = locations.find((w) => w.id === activeWh)?.name || activeWh;
    const lines = stockRows.map((r) => {
      const st = statusBadge(r.status).label;
      return [
        productSku(r.product),
        productDisplayName(r.product),
        r.product.group || '',
        r.unit,
        whName,
        String(r.onHand),
        r.min !== undefined ? String(r.min) : '',
        st,
      ]
        .map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
        .join(',');
    });
    const blob = new Blob(['\uFEFF' + [headers.join(','), ...lines].join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse_stock_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabBtn = (id: TabId, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
        tab === id ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="space-y-4 font-[Vazirmatn,Tahoma,sans-serif]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'قلم دارای موجودی', value: stats.skus, icon: Package, color: 'teal' },
          { label: 'مجموع واحد', value: formatStockQty(stats.units), icon: Boxes, color: 'blue' },
          { label: 'کمبود / آستانه', value: stats.low, icon: AlertTriangle, color: 'amber' },
          { label: 'گردش این ماه', value: stats.movesMonth, icon: History, color: 'indigo' },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex items-center gap-3"
          >
            <div
              className={`p-2 rounded-lg ${
                c.color === 'teal'
                  ? 'bg-teal-50'
                  : c.color === 'blue'
                    ? 'bg-blue-50'
                    : c.color === 'amber'
                      ? 'bg-amber-50'
                      : 'bg-indigo-50'
              }`}
            >
              <c.icon
                className={`w-5 h-5 ${
                  c.color === 'teal'
                    ? 'text-teal-600'
                    : c.color === 'blue'
                      ? 'text-blue-600'
                      : c.color === 'amber'
                        ? 'text-amber-600'
                        : 'text-indigo-600'
                }`}
              />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">{c.label}</p>
              <p className="text-lg font-bold text-slate-800 tabular-nums">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 gap-1 flex-1 max-w-xl">
          {tabBtn('stock', 'موجودی', Package)}
          {tabBtn('movements', 'گردش', History)}
          {tabBtn('warehouses', 'انبارها', Warehouse)}
        </div>
        {(tab === 'stock' || tab === 'movements') && (
          <select
            value={activeWh}
            onChange={(e) => setWarehouseFilterId(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white min-w-[140px]"
          >
            {locations.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
                {w.code ? ` (${w.code})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {tab === 'stock' && (
        <>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو SKU، نام، گروه…"
                className="w-full text-sm border border-slate-200 rounded-lg pr-9 pl-3 py-2"
                dir="rtl"
              />
            </div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="all">همه</option>
              <option value="instock">فقط موجود</option>
              <option value="low">کمبود</option>
              <option value="out">ناموجود</option>
            </select>
            <button
              type="button"
              onClick={exportStockCsv}
              className="inline-flex items-center justify-center gap-1.5 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>

          {catalogProducts.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-sm text-amber-900">
              ابتدا در تب «محاسبه صادرات» محصول تعریف کنید؛ سپس موجودی انبار را ثبت کنید.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[min(520px,60vh)] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr className="text-[10px] uppercase text-slate-500">
                      <th className="text-right px-3 py-2 font-semibold">کالا</th>
                      <th className="text-center px-2 py-2 font-semibold">واحد</th>
                      <th className="text-center px-2 py-2 font-semibold">موجودی</th>
                      <th className="text-center px-2 py-2 font-semibold">کل انبارها</th>
                      <th className="text-center px-2 py-2 font-semibold">حداقل</th>
                      <th className="text-center px-2 py-2 font-semibold">وضعیت</th>
                      <th className="text-center px-3 py-2 font-semibold w-36">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRows.map((row) => {
                      const badge = statusBadge(row.status);
                      return (
                        <tr key={row.product.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-800 text-xs">
                              {productDisplayName(row.product)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono" dir="ltr">
                              {productSku(row.product)}
                              {row.product.group ? ` · ${row.product.group}` : ''}
                              {supplierName(row.product.supplierId)
                                ? ` · ${supplierName(row.product.supplierId)}`
                                : ''}
                            </div>
                          </td>
                          <td className="text-center text-xs text-slate-600">{row.unit}</td>
                          <td className="text-center font-bold text-slate-900 tabular-nums" dir="ltr">
                            {formatStockQty(row.onHand)}
                          </td>
                          <td className="text-center text-xs text-slate-500 tabular-nums" dir="ltr">
                            {formatStockQty(row.totalAll)}
                          </td>
                          <td className="text-center px-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              dir="ltr"
                              placeholder="—"
                              defaultValue={row.min !== undefined ? formatStockQty(row.min) : ''}
                              key={`min-${row.product.id}-${row.min}`}
                              onBlur={(e) => setMinStock(row.product.id, e.target.value)}
                              className="w-16 text-xs text-center border border-slate-200 rounded px-1 py-0.5 mx-auto block"
                            />
                          </td>
                          <td className="text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex justify-center gap-1">
                              <button
                                type="button"
                                title="ورود"
                                onClick={() => openMovement('in', row.product.id)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="خروج"
                                onClick={() => openMovement('out', row.product.id)}
                                className="p-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                              >
                                <ArrowUpFromLine className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="اصلاح موجودی"
                                onClick={() => openMovement('adjustment', row.product.id)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {stockRows.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">موردی با این فیلتر نیست.</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'movements' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={histProductId}
              onChange={(e) => setHistProductId(e.target.value === '' ? '' : Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 flex-1 min-w-[160px]"
            >
              <option value="">همه محصولات</option>
              {catalogProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {productDisplayName(p)}
                </option>
              ))}
            </select>
            <select
              value={histType}
              onChange={(e) => setHistType(e.target.value as WarehouseMovementType | 'all')}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5"
            >
              <option value="all">همه انواع</option>
              <option value="in">ورود</option>
              <option value="out">خروج</option>
              <option value="adjustment">اصلاح</option>
            </select>
            <button
              type="button"
              onClick={() => openMovement('in', catalogProducts[0]?.id || 0)}
              className="text-sm bg-teal-600 text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-teal-700 inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              ثبت گردش
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[min(480px,55vh)] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b">
                <tr className="text-slate-500">
                  <th className="text-right px-3 py-2">تاریخ</th>
                  <th className="text-right px-2 py-2">کالا</th>
                  <th className="text-center px-2 py-2">انبار</th>
                  <th className="text-center px-2 py-2">نوع</th>
                  <th className="text-center px-2 py-2">مقدار</th>
                  <th className="text-center px-2 py-2">قبل → بعد</th>
                  <th className="text-right px-2 py-2">علت</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      هنوز گردشی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  historyRows.map((m) => {
                    const p = products.find((x) => x.id === m.productId);
                    const wh = locations.find((w) => w.id === m.warehouseId);
                    return (
                      <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600" dir="ltr">
                          {new Date(m.createdAt).toLocaleString('fa-IR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-2 py-2 text-slate-800 max-w-[140px] truncate">
                          {p ? productDisplayName(p) : `#${m.productId}`}
                        </td>
                        <td className="text-center text-slate-600">{wh?.name || m.warehouseId}</td>
                        <td className="text-center">
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded ${
                              m.type === 'in'
                                ? 'text-emerald-700 bg-emerald-50'
                                : m.type === 'out'
                                  ? 'text-orange-700 bg-orange-50'
                                  : 'text-slate-700 bg-slate-100'
                            }`}
                          >
                            {movementTypeLabel(m.type)}
                          </span>
                        </td>
                        <td className="text-center font-mono tabular-nums" dir="ltr">
                          {m.type === 'out' ? '−' : m.type === 'in' ? '+' : '±'}
                          {formatStockQty(m.qty)}
                        </td>
                        <td className="text-center font-mono text-[10px] tabular-nums" dir="ltr">
                          {formatStockQty(m.qtyBefore)} → {formatStockQty(m.qtyAfter)}
                        </td>
                        <td className="px-2 py-2 text-slate-600">
                          {reasonLabel(m.reason, m.type)}
                          {m.reference ? (
                            <span className="block text-[10px] text-slate-400" dir="ltr">
                              {m.reference}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'warehouses' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setWarehouseForm({ name: '', code: '', notes: '' })}
            className="text-sm bg-teal-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-teal-700 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            انبار جدید
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            {locations.map((w) => (
              <div key={w.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-slate-800">{w.name}</h3>
                    {w.code && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">
                        {w.code}
                      </p>
                    )}
                    {w.isDefault && (
                      <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                        پیش‌فرض
                      </span>
                    )}
                    {w.notes && <p className="text-xs text-slate-600 mt-2">{w.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setWarehouseForm({
                          id: w.id,
                          name: w.name,
                          code: w.code || '',
                          notes: w.notes || '',
                        })
                      }
                      className="p-1.5 text-slate-500 hover:text-teal-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteWarehouse(w.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {!w.isDefault && (
                  <button
                    type="button"
                    onClick={() =>
                      setLocations((prev) =>
                        prev.map((x) => ({ ...x, isDefault: x.id === w.id })),
                      )
                    }
                    className="mt-3 text-[10px] text-teal-700 font-semibold hover:underline"
                  >
                    تنظیم به‌عنوان پیش‌فرض
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {movementModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                {movementModal.type === 'in'
                  ? 'ورود به انبار'
                  : movementModal.type === 'out'
                    ? 'خروج از انبار'
                    : 'اصلاح موجودی'}
              </h3>
              <button type="button" onClick={() => setMovementModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">محصول</label>
                <select
                  value={movementModal.productId || ''}
                  onChange={(e) =>
                    setMovementModal((m) => m && { ...m, productId: Number(e.target.value) })
                  }
                  className="w-full border border-slate-200 rounded-lg px-2 py-2"
                >
                  <option value="">انتخاب…</option>
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {productDisplayName(p)} ({productSku(p)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">انبار</label>
                <select
                  value={movementModal.warehouseId}
                  onChange={(e) =>
                    setMovementModal((m) => m && { ...m, warehouseId: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-2 py-2"
                >
                  {locations.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              {movementModal.type !== 'adjustment' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">علت</label>
                    <select
                      value={movementModal.reason}
                      onChange={(e) =>
                        setMovementModal((m) => m && { ...m, reason: e.target.value })
                      }
                      className="w-full border border-slate-200 rounded-lg px-2 py-2"
                    >
                      {(movementModal.type === 'in' ? WAREHOUSE_IN_REASONS : WAREHOUSE_OUT_REASONS).map(
                        (r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">مقدار</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={movementModal.qtyText}
                      onChange={(e) =>
                        setMovementModal((m) =>
                          m
                            ? {
                                ...m,
                                qtyText: formatThousandsWhileTyping(e.target.value, {
                                  maxDecimalPlaces: 3,
                                }),
                              }
                            : m,
                        )
                      }
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 font-mono"
                      placeholder="0"
                    />
                    {movementModal.productId > 0 && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        موجودی فعلی:{' '}
                        <strong dir="ltr">
                          {formatStockQty(
                            stockOnHand(movements, movementModal.productId, movementModal.warehouseId),
                          )}
                        </strong>
                      </p>
                    )}
                  </div>
                </>
              )}
              {movementModal.type === 'adjustment' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">موجودی جدید (دقیق)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    value={movementModal.targetQtyText}
                    onChange={(e) =>
                      setMovementModal((m) =>
                        m
                          ? {
                              ...m,
                              targetQtyText: formatThousandsWhileTyping(e.target.value, {
                                maxDecimalPlaces: 3,
                              }),
                            }
                          : m,
                      )
                    }
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 font-mono"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">شماره مرجع (اختیاری)</label>
                <input
                  type="text"
                  value={movementModal.reference}
                  onChange={(e) =>
                    setMovementModal((m) => m && { ...m, reference: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-2 py-2"
                  dir="ltr"
                  placeholder="PO / فاکتور / …"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">یادداشت</label>
                <textarea
                  rows={2}
                  value={movementModal.note}
                  onChange={(e) => setMovementModal((m) => m && { ...m, note: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 resize-y"
                />
              </div>
              {movementError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {movementError}
                </p>
              )}
              <button
                type="button"
                onClick={submitMovement}
                className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700"
              >
                ثبت
              </button>
            </div>
          </div>
        </div>
      )}

      {warehouseForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 p-4 space-y-3">
            <h3 className="font-bold text-slate-800">{warehouseForm.id ? 'ویرایش انبار' : 'انبار جدید'}</h3>
            <input
              type="text"
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm((f) => f && { ...f, name: e.target.value })}
              placeholder="نام انبار"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={warehouseForm.code}
              onChange={(e) => setWarehouseForm((f) => f && { ...f, code: e.target.value })}
              placeholder="کد"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              dir="ltr"
            />
            <textarea
              rows={2}
              value={warehouseForm.notes}
              onChange={(e) => setWarehouseForm((f) => f && { ...f, notes: e.target.value })}
              placeholder="توضیحات"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWarehouseForm(null)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-sm"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={saveWarehouseForm}
                className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold"
              >
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
