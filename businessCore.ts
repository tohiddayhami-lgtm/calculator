import type {
  BusinessItem,
  BusinessItemType,
  BusinessKind,
  BusinessPricingModel,
  BusinessProfile,
  BusinessScenario,
  BusinessScenarioLine,
} from './types';

export const BUSINESS_KIND_OPTIONS: {
  value: BusinessKind;
  label: string;
  hint: string;
}[] = [
  { value: 'restaurant', label: 'رستوران / کافه', hint: 'منو، مواد اولیه، فروش روزانه' },
  { value: 'real_estate', label: 'املاک', hint: 'اجاره، فروش، واحد مسکونی/تجاری' },
  { value: 'retail', label: 'خرده‌فروشی', hint: 'کالا، قیمت، موجودی ساده' },
  { value: 'services', label: 'خدمات', hint: 'پکیج خدمات و تعرفه' },
  { value: 'export', label: 'صادرات / عمده', hint: 'هم‌راستا با محاسبه صادرات' },
  { value: 'custom', label: 'سفارشی', hint: 'هر نوع کسب‌وکار' },
];

export const BUSINESS_ITEM_TYPE_OPTIONS: { value: BusinessItemType; label: string }[] = [
  { value: 'product', label: 'کالا' },
  { value: 'service', label: 'خدمت' },
  { value: 'menu_item', label: 'آیتم منو' },
  { value: 'property', label: 'ملک / واحد' },
  { value: 'rental_unit', label: 'اجاره' },
  { value: 'package', label: 'پکیج' },
];

export const BUSINESS_PRICING_OPTIONS: { value: BusinessPricingModel; label: string }[] = [
  { value: 'per_unit', label: 'هر واحد' },
  { value: 'fixed', label: 'مبلغ ثابت' },
  { value: 'per_month', label: 'ماهانه' },
  { value: 'per_night', label: 'هر شب' },
  { value: 'per_sqm', label: 'هر متر مربع' },
  { value: 'per_person', label: 'هر نفر' },
  { value: 'custom', label: 'سفارشی' },
];

export function newBusinessId(): string {
  return `biz_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newBusinessItemId(): string {
  return `bitem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newBusinessScenarioId(): string {
  return `bsc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normKind(raw: unknown): BusinessKind {
  const k = String(raw ?? '').trim();
  const allowed: BusinessKind[] = [
    'restaurant',
    'real_estate',
    'retail',
    'services',
    'export',
    'custom',
  ];
  return allowed.includes(k as BusinessKind) ? (k as BusinessKind) : 'custom';
}

function normItemType(raw: unknown, kind?: BusinessKind): BusinessItemType {
  const t = String(raw ?? '').trim();
  const allowed: BusinessItemType[] = [
    'product',
    'service',
    'menu_item',
    'property',
    'rental_unit',
    'package',
  ];
  if (allowed.includes(t as BusinessItemType)) return t as BusinessItemType;
  if (kind === 'restaurant') return 'menu_item';
  if (kind === 'real_estate') return 'property';
  if (kind === 'services') return 'service';
  return 'product';
}

function normPricing(raw: unknown): BusinessPricingModel {
  const p = String(raw ?? '').trim();
  const allowed: BusinessPricingModel[] = [
    'fixed',
    'per_unit',
    'per_month',
    'per_night',
    'per_sqm',
    'per_person',
    'custom',
  ];
  return allowed.includes(p as BusinessPricingModel) ? (p as BusinessPricingModel) : 'per_unit';
}

function normCurrency(raw: unknown, fallback = 'USD'): string {
  const c = String(raw ?? '').trim().toUpperCase();
  return c.length >= 3 ? c.slice(0, 6) : fallback;
}

function num(raw: unknown, fallback = 0): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function normCustomFields(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(k).trim();
    if (!key) continue;
    out[key] = v === null || v === undefined ? '' : String(v);
  }
  return out;
}

export function normalizeBusinessProfile(raw: Partial<BusinessProfile> & { id?: string }): BusinessProfile {
  const now = Date.now();
  return {
    id: String(raw.id || newBusinessId()),
    name: String(raw.name ?? '').trim() || 'کسب‌وکار جدید',
    kind: normKind(raw.kind),
    description: String(raw.description ?? '').trim(),
    defaultCurrency: normCurrency(raw.defaultCurrency, 'USD'),
    createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : now,
    updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : now,
  };
}

export function normalizeBusinessItem(
  raw: Partial<BusinessItem> & { businessId: string },
  profile?: Pick<BusinessProfile, 'defaultCurrency' | 'kind'>,
): BusinessItem {
  const now = Date.now();
  const ccy = normCurrency(raw.currency, profile?.defaultCurrency || 'USD');
  return {
    id: String(raw.id || newBusinessItemId()),
    businessId: raw.businessId,
    name: String(raw.name ?? '').trim() || 'بدون نام',
    sku: raw.sku ? String(raw.sku).trim() : undefined,
    itemType: normItemType(raw.itemType, profile?.kind),
    category: String(raw.category ?? '').trim() || 'عمومی',
    unit: String(raw.unit ?? '').trim() || 'عدد',
    unitPrice: Math.max(0, num(raw.unitPrice)),
    costPrice: Math.max(0, num(raw.costPrice)),
    currency: ccy,
    pricingModel: normPricing(raw.pricingModel),
    notes: String(raw.notes ?? '').trim(),
    customFields: normCustomFields(raw.customFields),
    active: raw.active !== false,
    createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : now,
    updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : now,
  };
}

export function normalizeScenarioLine(raw: Partial<BusinessScenarioLine>): BusinessScenarioLine {
  return {
    itemId: String(raw.itemId ?? ''),
    qty: Math.max(0, num(raw.qty, 1)),
    unitPriceOverride:
      raw.unitPriceOverride !== undefined && raw.unitPriceOverride !== null
        ? Math.max(0, num(raw.unitPriceOverride))
        : undefined,
    discountPercent: Math.min(100, Math.max(0, num(raw.discountPercent))),
  };
}

export function normalizeBusinessScenario(
  raw: Partial<BusinessScenario> & { businessId: string },
): BusinessScenario {
  const now = Date.now();
  return {
    id: String(raw.id || newBusinessScenarioId()),
    businessId: raw.businessId,
    name: String(raw.name ?? '').trim() || 'سناریو جدید',
    lines: Array.isArray(raw.lines) ? raw.lines.map(normalizeScenarioLine) : [],
    globalDiscountPercent: Math.min(100, Math.max(0, num(raw.globalDiscountPercent))),
    notes: String(raw.notes ?? '').trim(),
    createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : now,
    updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : now,
  };
}

export type BusinessImportResult = {
  profilePatch?: Partial<BusinessProfile>;
  items: Omit<BusinessItem, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>[];
  warnings: string[];
};

/** Accept flexible JSON: { business, items } | { products } | array of items */
export function parseBusinessImportJson(text: string): BusinessImportResult {
  const warnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON نامعتبر است.');
  }

  const root = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const businessRaw = root?.business ?? root?.profile ?? root?.company;

  let profilePatch: Partial<BusinessProfile> | undefined;
  if (businessRaw && typeof businessRaw === 'object') {
    const b = businessRaw as Record<string, unknown>;
    profilePatch = {
      name: b.name !== undefined ? String(b.name) : undefined,
      kind: b.kind !== undefined ? normKind(b.kind) : undefined,
      description: b.description !== undefined ? String(b.description) : undefined,
      defaultCurrency:
        b.defaultCurrency !== undefined
          ? normCurrency(b.defaultCurrency)
          : b.currency !== undefined
            ? normCurrency(b.currency)
            : undefined,
    };
  }

  let rows: unknown[] = [];
  if (Array.isArray(data)) rows = data;
  else if (root) {
    const list =
      root.items ??
      root.products ??
      root.services ??
      root.menu ??
      root.properties ??
      root.catalog;
    if (Array.isArray(list)) rows = list;
    else warnings.push('لیست items/products یافت نشد؛ فقط پروفایل به‌روز می‌شود.');
  }

  const items = rows.map((row, i) => {
    if (!row || typeof row !== 'object') {
      warnings.push(`ردیف ${i + 1} نادیده گرفته شد.`);
      return null;
    }
    const o = row as Record<string, unknown>;
    const price =
      o.unitPrice ?? o.price ?? o.salePrice ?? o.rent ?? o.amount ?? o.rate ?? 0;
    const cost = o.costPrice ?? o.cost ?? o.purchasePrice ?? 0;
    return {
      name: String(o.name ?? o.title ?? o.label ?? `آیتم ${i + 1}`),
      sku: o.sku !== undefined ? String(o.sku) : o.code !== undefined ? String(o.code) : undefined,
      itemType: normItemType(o.itemType ?? o.type),
      category: String(o.category ?? o.group ?? 'عمومی'),
      unit: String(o.unit ?? o.uom ?? 'عدد'),
      unitPrice: Math.max(0, num(price)),
      costPrice: Math.max(0, num(cost)),
      currency: normCurrency(o.currency ?? (profilePatch as { defaultCurrency?: string })?.defaultCurrency),
      pricingModel: normPricing(o.pricingModel ?? o.pricing),
      notes: String(o.notes ?? o.description ?? ''),
      customFields: normCustomFields(o.customFields ?? o.meta ?? o.attributes),
      active: o.active !== false,
    };
  }).filter(Boolean) as BusinessImportResult['items'];

  return { profilePatch, items, warnings };
}

export type ScenarioLineCalc = {
  line: BusinessScenarioLine;
  item: BusinessItem;
  unitPrice: number;
  lineRevenue: number;
  lineCost: number;
  lineProfit: number;
};

export type ScenarioTotals = {
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  lines: ScenarioLineCalc[];
  byCurrency: Record<string, { revenue: number; cost: number }>;
};

export function calculateScenario(
  scenario: BusinessScenario,
  items: BusinessItem[],
): ScenarioTotals {
  const itemMap = new Map(items.filter((i) => i.active).map((i) => [i.id, i]));
  const lines: ScenarioLineCalc[] = [];
  const byCurrency: Record<string, { revenue: number; cost: number }> = {};

  for (const line of scenario.lines) {
    const item = itemMap.get(line.itemId);
    if (!item) continue;
    const unitPrice =
      line.unitPriceOverride !== undefined ? line.unitPriceOverride : item.unitPrice;
    const gross = unitPrice * line.qty;
    const disc = gross * (Math.min(100, Math.max(0, line.discountPercent)) / 100);
    const lineRevenue = Math.max(0, gross - disc);
    const lineCost = Math.max(0, item.costPrice * line.qty);
    lines.push({
      line,
      item,
      unitPrice,
      lineRevenue,
      lineCost,
      lineProfit: lineRevenue - lineCost,
    });
    if (!byCurrency[item.currency]) byCurrency[item.currency] = { revenue: 0, cost: 0 };
    byCurrency[item.currency].revenue += lineRevenue;
    byCurrency[item.currency].cost += lineCost;
  }

  let revenue = lines.reduce((s, l) => s + l.lineRevenue, 0);
  const cost = lines.reduce((s, l) => s + l.lineCost, 0);
  const gDisc = scenario.globalDiscountPercent / 100;
  revenue = Math.max(0, revenue * (1 - gDisc));
  const profit = revenue - cost;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  return { revenue, cost, profit, marginPct, lines, byCurrency };
}

export function pricingModelLabel(m: BusinessPricingModel): string {
  return BUSINESS_PRICING_OPTIONS.find((o) => o.value === m)?.label ?? m;
}

export function itemTypeLabel(t: BusinessItemType): string {
  return BUSINESS_ITEM_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function kindLabel(k: BusinessKind): string {
  return BUSINESS_KIND_OPTIONS.find((o) => o.value === k)?.label ?? k;
}

export function sampleImportJson(kind: BusinessKind): string {
  if (kind === 'restaurant') {
    return JSON.stringify(
      {
        business: { name: 'رستوران نمونه', kind: 'restaurant', defaultCurrency: 'IRR' },
        items: [
          {
            name: 'پیتزا مارگاریتا',
            itemType: 'menu_item',
            category: 'غذا',
            unitPrice: 450000,
            costPrice: 180000,
            currency: 'IRR',
            pricingModel: 'per_unit',
            customFields: { prepMin: '15' },
          },
          {
            name: 'نوشابه',
            itemType: 'menu_item',
            category: 'نوشیدنی',
            unitPrice: 35000,
            costPrice: 12000,
            currency: 'IRR',
          },
        ],
      },
      null,
      2,
    );
  }
  if (kind === 'real_estate') {
    return JSON.stringify(
      {
        business: { name: 'املاک نمونه', kind: 'real_estate', defaultCurrency: 'IRR' },
        items: [
          {
            name: 'آپارتمان ۱۲۰ متری — ونک',
            itemType: 'property',
            category: 'فروش',
            unitPrice: 12500000000,
            costPrice: 11000000000,
            currency: 'IRR',
            pricingModel: 'fixed',
            customFields: { area_sqm: '120', bedrooms: '2' },
          },
          {
            name: 'واحد اداری — اجاره ماهانه',
            itemType: 'rental_unit',
            category: 'اجاره',
            unitPrice: 85000000,
            costPrice: 0,
            currency: 'IRR',
            pricingModel: 'per_month',
          },
        ],
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      business: { name: 'کسب‌وکار نمونه', kind, defaultCurrency: 'USD' },
      items: [
        {
          name: 'محصول یا خدمت نمونه',
          itemType: 'product',
          category: 'عمومی',
          unitPrice: 100,
          costPrice: 60,
          currency: 'USD',
          pricingModel: 'per_unit',
        },
      ],
    },
    null,
    2,
  );
}
