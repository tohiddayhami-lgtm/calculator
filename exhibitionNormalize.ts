import type {
  EducationFeeCurrency,
  ExhibitionBoothCategory,
  ExhibitionEvent,
  ExhibitionReservation,
} from './types';
import { currencyShort } from './educationFormat';

const DEFAULT_CATEGORY_COLORS = ['#8b5cf6', '#06b6d4', '#f97316', '#22c55e', '#ec4899', '#eab308'];

function normCurrency(raw: unknown): EducationFeeCurrency {
  if (raw === 'IRR' || raw === 'USD') return raw;
  return 'OMR';
}

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function boothCode(category: Pick<ExhibitionBoothCategory, 'prefix'>, boothNumber: number): string {
  const prefix = (category.prefix || 'B').trim().toUpperCase();
  return `${prefix}-${String(Math.max(1, boothNumber)).padStart(2, '0')}`;
}

export function normalizeExhibitionReservation(r: ExhibitionReservation): ExhibitionReservation {
  return {
    ...r,
    categoryId: typeof r.categoryId === 'string' ? r.categoryId : '',
    boothNumber: clampInt(r.boothNumber, 1, 999, 1),
    companyName: typeof r.companyName === 'string' ? r.companyName : '',
    contactName: typeof r.contactName === 'string' ? r.contactName : '',
    phone: typeof r.phone === 'string' ? r.phone : '',
    city: typeof r.city === 'string' ? r.city : '',
    products: typeof r.products === 'string' ? r.products : '',
    storeUrl: typeof r.storeUrl === 'string' ? r.storeUrl : '',
    reservationStatus: r.reservationStatus === 'reserved' ? 'reserved' : 'confirmed',
    amountPaid: r.amountPaid ?? '',
    amountRemaining: r.amountRemaining ?? '',
    paymentNote: r.paymentNote ?? '',
    reservedAt: typeof r.reservedAt === 'number' ? r.reservedAt : Date.now(),
  };
}

function normalizeCategory(raw: unknown, index: number): ExhibitionBoothCategory | null {
  const c = raw as Partial<ExhibitionBoothCategory> | null;
  if (!c || typeof c !== 'object') return null;
  const id = typeof c.id === 'string' && c.id ? c.id : `cat_${index + 1}`;
  return {
    id,
    name: typeof c.name === 'string' && c.name.trim() ? c.name : `دسته ${index + 1}`,
    description: typeof c.description === 'string' ? c.description : '',
    prefix: typeof c.prefix === 'string' && c.prefix.trim() ? c.prefix.trim().toUpperCase().slice(0, 4) : String.fromCharCode(65 + index),
    boothCount: clampInt(c.boothCount, 1, 500, 20),
    color: typeof c.color === 'string' && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length],
  };
}

export function normalizeExhibitionEvent(event: ExhibitionEvent): ExhibitionEvent {
  const categories = Array.isArray(event.categories)
    ? event.categories.map(normalizeCategory).filter(Boolean) as ExhibitionBoothCategory[]
    : [];
  const safeCategories = categories.length
    ? categories
    : [
        {
          id: 'cat_default',
          name: 'غرفه‌های عمومی',
          description: '',
          prefix: 'A',
          boothCount: 30,
          color: '#8b5cf6',
        },
      ];
  const categoryIds = new Set(safeCategories.map(c => c.id));
  const opacity =
    typeof event.storyBackgroundOpacity === 'number' && Number.isFinite(event.storyBackgroundOpacity)
      ? Math.min(100, Math.max(0, Math.round(event.storyBackgroundOpacity)))
      : 35;
  return {
    ...event,
    title: typeof event.title === 'string' ? event.title : '',
    subtitle: typeof event.subtitle === 'string' ? event.subtitle : '',
    organizerName: typeof event.organizerName === 'string' ? event.organizerName : '',
    location: typeof event.location === 'string' ? event.location : '',
    startDate: typeof event.startDate === 'string' ? event.startDate : '',
    endDate: typeof event.endDate === 'string' ? event.endDate : '',
    boothFee: event.boothFee ?? '',
    boothFeeLabel:
      typeof event.boothFeeLabel === 'string' && event.boothFeeLabel.trim()
        ? event.boothFeeLabel.trim()
        : 'هزینه غرفه',
    boothFeeCurrency: normCurrency(event.boothFeeCurrency),
    boothFeeCurrencyLabel:
      typeof event.boothFeeCurrencyLabel === 'string'
        ? event.boothFeeCurrencyLabel
        : currencyShort(normCurrency(event.boothFeeCurrency)),
    storyBackgroundUrl: typeof event.storyBackgroundUrl === 'string' ? event.storyBackgroundUrl : '',
    storyBackgroundOpacity: opacity,
    storyFootNote: typeof event.storyFootNote === 'string' ? event.storyFootNote : '',
    categories: safeCategories,
    reservations: (event.reservations ?? [])
      .map(normalizeExhibitionReservation)
      .filter(r => categoryIds.has(r.categoryId)),
  };
}
