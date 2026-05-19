import { defaultWarehouseLocations } from './warehouseCore';
import type {
  WarehouseLocation,
  WarehouseMovement,
  WarehouseMovementType,
  WarehouseProductSettings,
} from './types';

function normMovementType(raw: unknown): WarehouseMovementType {
  if (raw === 'in' || raw === 'out' || raw === 'adjustment') return raw;
  return 'in';
}

export function parseWarehouseLocations(raw: unknown): WarehouseLocation[] {
  if (!Array.isArray(raw) || !raw.length) return defaultWarehouseLocations();
  const out = raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === 'string' && o.id ? o.id : '';
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      if (!id || !name) return null;
      return {
        id,
        name: name.slice(0, 120),
        code: typeof o.code === 'string' ? o.code.trim().slice(0, 32) : undefined,
        notes: typeof o.notes === 'string' ? o.notes.trim().slice(0, 500) : undefined,
        isDefault: o.isDefault === true,
        createdAt: Number(o.createdAt) || Date.now(),
      };
    })
    .filter(Boolean) as WarehouseLocation[];
  if (!out.length) return defaultWarehouseLocations();
  if (!out.some((w) => w.isDefault)) out[0].isDefault = true;
  return out;
}

export function parseWarehouseMovements(raw: unknown): WarehouseMovement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === 'string' && o.id ? o.id : '';
      const productId = Number(o.productId);
      const warehouseId = typeof o.warehouseId === 'string' ? o.warehouseId : '';
      if (!id || !Number.isFinite(productId) || !warehouseId) return null;
      const type = normMovementType(o.type);
      const qty = Math.max(0, Number(o.qty) || 0);
      return {
        id,
        productId,
        warehouseId,
        type,
        qty,
        qtyBefore: Math.max(0, Number(o.qtyBefore) || 0),
        qtyAfter: Math.max(0, Number(o.qtyAfter) || 0),
        reason: typeof o.reason === 'string' ? o.reason.slice(0, 64) : 'other',
        note: typeof o.note === 'string' ? o.note.slice(0, 500) : undefined,
        reference: typeof o.reference === 'string' ? o.reference.slice(0, 120) : undefined,
        createdAt: Number(o.createdAt) || Date.now(),
      };
    })
    .filter(Boolean) as WarehouseMovement[];
}

export function parseWarehouseProductSettings(raw: unknown): WarehouseProductSettings[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const productId = Number(o.productId);
      if (!Number.isFinite(productId)) return null;
      const minStock =
        o.minStock !== undefined && o.minStock !== null
          ? Math.max(0, Number(o.minStock) || 0)
          : undefined;
      return { productId, minStock: minStock && minStock > 0 ? minStock : undefined };
    })
    .filter(Boolean) as WarehouseProductSettings[];
}
