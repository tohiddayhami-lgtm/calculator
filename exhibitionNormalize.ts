import type {
  EducationFeeCurrency,
  ExhibitionBoothCategory,
  ExhibitionEvent,
  ExhibitionMasterLink,
  ExhibitionReservation,
  ExhibitionTopViewMarker,
  ExhibitionTopViewStructure,
} from './types';
import { currencyShort, normalizeLocalizedDigits } from './educationFormat';

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
    logoUrl: typeof r.logoUrl === 'string' ? r.logoUrl : '',
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

function normalizeTopViewMarker(raw: unknown, categoryIds: Set<string>, index: number): ExhibitionTopViewMarker | null {
  const marker = raw as Partial<ExhibitionTopViewMarker> | null;
  if (!marker || typeof marker !== 'object') return null;
  const categoryId =
    typeof marker.categoryId === 'string' && categoryIds.has(marker.categoryId)
      ? marker.categoryId
      : Array.from(categoryIds)[0] || '';
  if (!categoryId) return null;
  const kind: ExhibitionTopViewMarker['kind'] =
    marker.kind === 'conference' ||
    marker.kind === 'exit' ||
    marker.kind === 'guide' ||
    marker.kind === 'ad'
      ? marker.kind
      : 'entrance';
  const num = (value: unknown, fallback: number) => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
  };
  const defaultColors: Record<ExhibitionTopViewMarker['kind'], string> = {
    entrance: '#22d3ee',
    conference: '#a78bfa',
    exit: '#34d399',
    guide: '#facc15',
    ad: '#fb7185',
  };
  return {
    id: typeof marker.id === 'string' && marker.id ? marker.id : `marker_${index + 1}`,
    kind,
    categoryId,
    title: typeof marker.title === 'string' ? marker.title : '',
    description: typeof marker.description === 'string' ? marker.description : '',
    x: num(marker.x, 50),
    y: num(marker.y, 50),
    color:
      typeof marker.color === 'string' && /^#[0-9a-f]{6}$/i.test(marker.color)
        ? marker.color
        : defaultColors[kind],
    opacity: clampPercent(marker.opacity, 10, 100, 88),
    url: typeof marker.url === 'string' ? marker.url : '',
  };
}

function clampPercent(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

function clampStoryNumber(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

function normalizeTopViewStructure(raw: unknown, categoryIds: Set<string>, index: number): ExhibitionTopViewStructure | null {
  const structure = raw as Partial<ExhibitionTopViewStructure> | null;
  if (!structure || typeof structure !== 'object') return null;
  const categoryId =
    typeof structure.categoryId === 'string' && categoryIds.has(structure.categoryId)
      ? structure.categoryId
      : Array.from(categoryIds)[0] || '';
  if (!categoryId) return null;
  const kind: ExhibitionTopViewStructure['kind'] =
    structure.kind === 'divider' || structure.kind === 'pavilion' ? structure.kind : 'column';
  const defaultColors: Record<ExhibitionTopViewStructure['kind'], string> = {
    column: '#38bdf8',
    divider: '#facc15',
    pavilion: '#22c55e',
  };
  return {
    id: typeof structure.id === 'string' && structure.id ? structure.id : `structure_${index + 1}`,
    kind,
    categoryId,
    title: typeof structure.title === 'string' ? structure.title : '',
    description: typeof structure.description === 'string' ? structure.description : '',
    x: clampPercent(structure.x, 0, 100, 50),
    y: clampPercent(structure.y, 0, 100, 50),
    width: clampPercent(structure.width, 1, 100, kind === 'pavilion' ? 28 : kind === 'divider' ? 2 : 8),
    height: clampPercent(structure.height, 1, 100, kind === 'pavilion' ? 30 : kind === 'divider' ? 75 : 8),
    color:
      typeof structure.color === 'string' && /^#[0-9a-f]{6}$/i.test(structure.color)
        ? structure.color
        : defaultColors[kind],
    opacity: clampPercent(structure.opacity, 5, 100, kind === 'pavilion' ? 18 : 42),
  };
}

function normalizeMasterLink(raw: unknown): ExhibitionMasterLink | undefined {
  const link = raw as Partial<ExhibitionMasterLink> | null;
  if (!link || typeof link !== 'object') return undefined;
  if (typeof link.shortCode !== 'string' || !link.shortCode.trim()) return undefined;
  if (typeof link.shortUrl !== 'string' || !link.shortUrl.trim()) return undefined;
  if (typeof link.storagePath !== 'string' || !link.storagePath.trim()) return undefined;
  return {
    shortCode: link.shortCode,
    shortUrl: link.shortUrl,
    storagePath: link.storagePath,
    fullUrl: typeof link.fullUrl === 'string' ? link.fullUrl : '',
    catalogLinkId: typeof link.catalogLinkId === 'string' ? link.catalogLinkId : '',
    updatedAt: typeof link.updatedAt === 'number' ? link.updatedAt : Date.now(),
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
    startDate: typeof event.startDate === 'string' ? normalizeLocalizedDigits(event.startDate) : '',
    endDate: typeof event.endDate === 'string' ? normalizeLocalizedDigits(event.endDate) : '',
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
    storyHeaderText: typeof event.storyHeaderText === 'string' ? event.storyHeaderText : '',
    storyHeaderTitleGapPx: clampStoryNumber(event.storyHeaderTitleGapPx, 0, 80, 12),
    storyTitleMetaGapPx: clampStoryNumber(event.storyTitleMetaGapPx, 0, 80, 8),
    storyFootNote: typeof event.storyFootNote === 'string' ? event.storyFootNote : '',
    categories: safeCategories,
    reservations: (event.reservations ?? [])
      .map(normalizeExhibitionReservation)
      .filter(r => categoryIds.has(r.categoryId)),
    topViewMarkers: Array.isArray(event.topViewMarkers)
      ? event.topViewMarkers
          .map((marker, index) => normalizeTopViewMarker(marker, categoryIds, index))
          .filter(Boolean) as ExhibitionTopViewMarker[]
      : [],
    topViewStructures: Array.isArray(event.topViewStructures)
      ? event.topViewStructures
          .map((structure, index) => normalizeTopViewStructure(structure, categoryIds, index))
          .filter(Boolean) as ExhibitionTopViewStructure[]
      : [],
    onlineMasterLink: normalizeMasterLink(event.onlineMasterLink),
    topViewMasterLink: normalizeMasterLink(event.topViewMasterLink),
  };
}
