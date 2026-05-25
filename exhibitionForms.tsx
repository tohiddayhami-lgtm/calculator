import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  EducationFeeCurrency,
  ExhibitionBoothCategory,
  ExhibitionEvent,
  ExhibitionPublicReservationRequest,
  ExhibitionReservation,
  ExhibitionReservationStatus,
  ExhibitionTopViewMarker,
  ExhibitionTopViewStructure,
} from './types';
import {
  EDUCATION_CURRENCY_OPTIONS,
  currencyShort,
  formatAmountDisplay,
  formatAmountWithCurrency,
  parseAmountDigits,
  parseAmountNumber,
} from './educationFormat';
import { boothCode, normalizeExhibitionEvent } from './exhibitionNormalize';
import {
  downloadExhibitionStory,
  EXHIBITION_STORY_EXPORT_HEIGHT,
  EXHIBITION_STORY_EXPORT_WIDTH,
  EXHIBITION_STORY_HEIGHT,
  EXHIBITION_STORY_WIDTH,
  renderExhibitionStoryPng,
} from './exhibitionStoryExport';

export const EXHIBITION_STORAGE_KEY = 'exportcalc_exhibition_events_v1';
export const META_MALL_STORAGE_KEY = 'exportcalc_meta_mall_events_v1';

const BACKGROUND_MAX_BYTES = 5 * 1024 * 1024;
const COMPANY_LOGO_MAX_BYTES = 2 * 1024 * 1024;
const CATEGORY_COLORS = ['#8b5cf6', '#06b6d4', '#f97316', '#22c55e', '#ec4899', '#eab308', '#14b8a6', '#ef4444'];
const TOP_VIEW_MARKER_KIND_OPTIONS: {
  value: ExhibitionTopViewMarker['kind'];
  label: string;
  defaultTitle: string;
  color: string;
}[] = [
  { value: 'entrance', label: 'Entrance / ورودی', defaultTitle: 'Main Entrance', color: '#22d3ee' },
  { value: 'conference', label: 'Conference Hall / سالن کنفرانس', defaultTitle: 'Conference Hall', color: '#a78bfa' },
  { value: 'exit', label: 'End / Exit / انتهای مسیر', defaultTitle: 'Exit / End of Exhibition', color: '#34d399' },
  { value: 'guide', label: 'Guide Sign / راهنما', defaultTitle: 'Visitor Guide', color: '#facc15' },
  { value: 'ad', label: 'Ad Board / تابلو تبلیغاتی', defaultTitle: 'Advertising Board', color: '#fb7185' },
];
const TOP_VIEW_STRUCTURE_KIND_OPTIONS: {
  value: ExhibitionTopViewStructure['kind'];
  label: string;
  defaultTitle: string;
  color: string;
  width: number;
  height: number;
  opacity: number;
}[] = [
  { value: 'column', label: 'Movable Column / ستون متحرک', defaultTitle: 'Central Column', color: '#38bdf8', width: 8, height: 8, opacity: 55 },
  { value: 'divider', label: 'Boundary Line / خط مرزی', defaultTitle: 'Pavilion Boundary', color: '#facc15', width: 2, height: 75, opacity: 65 },
  { value: 'pavilion', label: 'Pavilion Area / محدوده پاویون', defaultTitle: 'Iran Pavilion', color: '#22c55e', width: 30, height: 34, opacity: 18 },
];

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type ExhibitionFormsVariant = 'exhibition' | 'mall';

function makeCategory(index: number, variant: ExhibitionFormsVariant = 'exhibition'): ExhibitionBoothCategory {
  const isMall = variant === 'mall';
  return {
    id: newId(),
    name: index === 0 ? (isMall ? 'مغازه‌های طبقه همکف' : 'غرفه‌های عمومی') : (isMall ? `زون ${index + 1}` : `دسته ${index + 1}`),
    description: isMall && index === 0 ? 'Tohid Meta Mall - retail corridor' : '',
    prefix: isMall ? `S${index + 1}` : String.fromCharCode(65 + Math.min(25, index)),
    boothCount: isMall ? 40 : 30,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  };
}

export function makeBlankExhibitionEvent(variant: ExhibitionFormsVariant = 'exhibition'): ExhibitionEvent {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const isMall = variant === 'mall';
  return {
    id: String(now),
    title: isMall ? 'Tohid Meta Mall' : '',
    subtitle: isMall ? 'Premium retail shop rental map' : '',
    organizerName: isMall ? 'Tohid Meta Mall Leasing' : '',
    location: isMall ? 'Tohid Meta Mall' : '',
    startDate: today,
    endDate: today,
    boothFee: '',
    boothFeeLabel: isMall ? 'اجاره مغازه' : 'هزینه غرفه',
    boothFeeCurrency: 'OMR',
    boothFeeCurrencyLabel: 'OMR',
    storyBackgroundUrl: '',
    storyBackgroundOpacity: 35,
    storyHeaderText: isMall ? 'نقشه Top View و اجاره مغازه‌های متامال' : 'نقشه Top View و رزرو غرفه‌های نمایشگاهی',
    storyHeaderTitleGapPx: 12,
    storyTitleMetaGapPx: 8,
    storyFootNote: isMall ? 'برای انتخاب و اجاره مغازه، شماره مغازه موردنظر را اعلام کنید.' : 'برای انتخاب و رزرو غرفه، شماره غرفه موردنظر را اعلام کنید.',
    categories: [makeCategory(0, variant)],
    reservations: [],
    topViewMarkers: [],
    topViewStructures: [],
    createdAt: now,
    updatedAt: now,
  };
}

function updateReservation(
  reservations: ExhibitionReservation[],
  id: string,
  patch: Partial<ExhibitionReservation>,
): ExhibitionReservation[] {
  return reservations.map(r => (r.id === id ? { ...r, ...patch } : r));
}

function nextBoothNumber(event: ExhibitionEvent, categoryId: string): number | null {
  const category = event.categories.find(c => c.id === categoryId);
  if (!category) return null;
  const used = new Set(event.reservations.filter(r => r.categoryId === categoryId).map(r => r.boothNumber));
  for (let n = 1; n <= category.boothCount; n++) {
    if (!used.has(n)) return n;
  }
  return null;
}

function categoryStats(event: ExhibitionEvent, categoryId: string) {
  const reservations = event.reservations.filter(r => r.categoryId === categoryId);
  const confirmed = reservations.filter(r => r.reservationStatus === 'confirmed').length;
  return { filled: reservations.length, confirmed, reserved: reservations.length - confirmed };
}

function topViewFloorCols(boothCount: number): number {
  const count = Math.max(1, Math.round(boothCount || 1));
  const minCols = count <= 20 ? 4 : count <= 48 ? 5 : 8;
  const maxCols = Math.min(16, count);
  const ideal = Math.sqrt(count);
  let bestCols = Math.min(maxCols, Math.max(minCols, Math.round(ideal)));
  let bestScore = Number.POSITIVE_INFINITY;
  for (let cols = minCols; cols <= maxCols; cols++) {
    const rows = Math.ceil(count / cols);
    const emptySlots = rows * cols - count;
    const aspectPenalty = Math.abs(cols / rows - 1.35);
    const score = emptySlots * 12 + aspectPenalty * 3 + Math.abs(cols - ideal) * 0.2;
    if (score < bestScore) {
      bestScore = score;
      bestCols = cols;
    }
  }
  return bestCols;
}

function hexToRgba(hex: string, opacity: number): string {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#38bdf8';
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(100, Math.max(0, opacity)) / 100})`;
}

type Props = {
  events: ExhibitionEvent[];
  onSaveEvents: (events: ExhibitionEvent[]) => void;
  onPublishOnline?: (event: ExhibitionEvent, options?: ExhibitionPublishOptions) => Promise<ExhibitionPublishResult>;
  onPublishTopView?: (event: ExhibitionEvent, options?: ExhibitionPublishOptions) => Promise<ExhibitionPublishResult>;
  publicReservationRequests?: ExhibitionPublicReservationRequest[];
  onReviewPublicReservationRequest?: (
    request: ExhibitionPublicReservationRequest,
    reviewStatus: 'accepted' | 'rejected',
  ) => Promise<void>;
  variant?: ExhibitionFormsVariant;
};

type ExhibitionPublishOptions = {
  master?: boolean;
  existingShortCode?: string;
  existingStoragePath?: string;
  existingCatalogLinkId?: string;
};

type ExhibitionPublishResult = {
  url: string;
  shortUrl?: string;
  qr?: string;
  shortCode?: string;
  storagePath?: string;
  catalogLinkId?: string;
  master?: boolean;
};

export const ExhibitionFormsPanel = React.memo(function ExhibitionFormsPanel({
  events,
  onSaveEvents,
  onPublishOnline,
  onPublishTopView,
  publicReservationRequests = [],
  onReviewPublicReservationRequest,
  variant = 'exhibition',
}: Props) {
  const isMall = variant === 'mall';
  const unitLabel = isMall ? 'مغازه' : 'غرفه';
  const moduleTitle = isMall ? 'Tohid Meta Mall' : 'Exhibition';
  const newItemTitle = isMall ? 'پاساژ جدید' : 'نمایشگاه جدید';
  const topViewLinkLabel = isMall ? 'لینک Mall Top View' : 'لینک Top View Hall';
  const [subView, setSubView] = useState<'list' | 'editor'>('list');
  const [editorTab, setEditorTab] = useState<'setup' | 'topview'>('setup');
  const [editing, setEditing] = useState<ExhibitionEvent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
  const [onlineLinkInfo, setOnlineLinkInfo] = useState<{
    url: string;
    shortUrl?: string;
    qr?: string;
    uploading?: boolean;
    error?: string;
  } | null>(null);
  const [topViewLinkInfo, setTopViewLinkInfo] = useState<{
    url: string;
    shortUrl?: string;
    qr?: string;
    uploading?: boolean;
    error?: string;
  } | null>(null);
  const [onlineMasterMode, setOnlineMasterMode] = useState(false);
  const [topViewMasterMode, setTopViewMasterMode] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState({
    categoryId: '',
    companyName: '',
    contactName: '',
    phone: '',
    city: '',
    products: '',
    logoUrl: '',
    storeUrl: '',
    reservationStatus: 'confirmed' as ExhibitionReservationStatus,
    amountPaid: '',
    amountRemaining: '',
    paymentNote: '',
  });
  const [reservationEditForm, setReservationEditForm] = useState<{
    companyName: string;
    contactName: string;
    phone: string;
    city: string;
    products: string;
    logoUrl: string;
    storeUrl: string;
    reservationStatus: ExhibitionReservationStatus;
    amountPaid: string;
    amountRemaining: string;
    paymentNote: string;
  } | null>(null);

  const saveEvent = (event: ExhibitionEvent) => {
    const next = normalizeExhibitionEvent({ ...event, updatedAt: Date.now() });
    const exists = events.some(x => x.id === event.id);
    onSaveEvents(exists ? events.map(x => (x.id === event.id ? next : x)) : [...events, next]);
    return next;
  };

  const upd = (patch: Partial<ExhibitionEvent>) => {
    if (!editing) return;
    setEditing(normalizeExhibitionEvent({ ...editing, ...patch, updatedAt: Date.now() }));
  };

  const totalBooths = editing?.categories.reduce((sum, c) => sum + c.boothCount, 0) ?? 0;
  const filled = editing?.reservations.length ?? 0;
  const isFull = totalBooths > 0 && filled >= totalBooths;
  const confirmedCount = editing?.reservations.filter(r => r.reservationStatus === 'confirmed').length ?? 0;
  const reservedCount = filled - confirmedCount;
  const currentOnlineRequests = editing
    ? publicReservationRequests.filter(request => request.eventId === editing.id)
    : [];
  const newOnlineRequests = currentOnlineRequests.filter(request => request.reviewStatus !== 'accepted' && request.reviewStatus !== 'rejected');

  const selectedCategoryId = reservationForm.categoryId || editing?.categories[0]?.id || '';
  const selectedCategory = editing?.categories.find(c => c.id === selectedCategoryId) ?? editing?.categories[0];
  const selectedCategoryFull =
    !!editing &&
    !!selectedCategory &&
    categoryStats(editing, selectedCategory.id).filled >= selectedCategory.boothCount;

  const boothMaps = useMemo(() => {
    if (!editing) return [];
    return editing.categories.map(category => {
      const taken = new Map<number, ExhibitionReservation>();
      editing.reservations
        .filter(r => r.categoryId === category.id)
        .forEach(r => taken.set(r.boothNumber, r));
      const cols = topViewFloorCols(category.boothCount);
      const cells: { num: number; reservation?: ExhibitionReservation }[] = [];
      for (let n = 1; n <= category.boothCount; n++) {
        cells.push({ num: n, reservation: taken.get(n) });
      }
      return { category, cols, cells, stats: categoryStats(editing, category.id) };
    });
  }, [editing]);

  const inputCls =
    'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 font-[Vazirmatn,Tahoma,sans-serif]';
  const labelCls = 'text-xs text-slate-500 font-medium mb-1 block';
  const onAmountInput = (raw: string) => parseAmountDigits(raw.replace(/,/g, '').replace(/،/g, ''));
  const defaultStoryHeaderText = isMall
    ? 'نقشه Top View و اجاره مغازه‌های متامال'
    : 'نقشه Top View و رزرو غرفه‌های نمایشگاهی';
  const storyHeaderTitleGapPx = Math.min(80, Math.max(0, Math.round(editing?.storyHeaderTitleGapPx ?? 12)));
  const storyTitleMetaGapPx = Math.min(80, Math.max(0, Math.round(editing?.storyTitleMetaGapPx ?? 8)));

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('فقط فایل تصویر برای پس‌زمینه استوری مجاز است.');
      return;
    }
    if (file.size > BACKGROUND_MAX_BYTES) {
      alert('حجم تصویر پس‌زمینه حداکثر ۵ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => upd({ storyBackgroundUrl: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'form' | 'edit') => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('فقط فایل تصویر برای لوگوی شرکت مجاز است.');
      return;
    }
    if (file.size > COMPANY_LOGO_MAX_BYTES) {
      alert('حجم لوگوی شرکت حداکثر ۲ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const logoUrl = String(reader.result || '');
      if (target === 'form') {
        setReservationForm(f => ({ ...f, logoUrl }));
      } else {
        setReservationEditForm(f => f && ({ ...f, logoUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const patchCategory = (id: string, patch: Partial<ExhibitionBoothCategory>) => {
    if (!editing) return;
    let reservations = editing.reservations;
    if (typeof patch.boothCount === 'number') {
      const oldCat = editing.categories.find(c => c.id === id);
      const nextCount = patch.boothCount;
      const overflow = reservations.filter(r => r.categoryId === id && r.boothNumber > nextCount);
      if (oldCat && overflow.length > 0) {
        if (!confirm(`با کاهش ظرفیت، ${overflow.length} رزرو خارج از محدوده حذف می‌شود. ادامه می‌دهید؟`)) return;
        reservations = reservations.filter(r => !(r.categoryId === id && r.boothNumber > nextCount));
      }
    }
    upd({
      categories: editing.categories.map(c => (c.id === id ? { ...c, ...patch } : c)),
      reservations,
    });
  };

  const addCategory = () => {
    if (!editing) return;
    upd({ categories: [...editing.categories, makeCategory(editing.categories.length, variant)] });
  };

  const removeCategory = (id: string) => {
    if (!editing) return;
    if (editing.categories.length <= 1) {
        alert(`حداقل یک ${isMall ? 'زون مغازه' : 'دسته غرفه'} لازم است.`);
      return;
    }
    const category = editing.categories.find(c => c.id === id);
    const related = editing.reservations.filter(r => r.categoryId === id).length;
    if (!confirm(`دسته «${category?.name || ''}» حذف شود؟ ${related ? `${related} رزرو هم حذف می‌شود.` : ''}`)) return;
    const categories = editing.categories.filter(c => c.id !== id);
    upd({
      categories,
      reservations: editing.reservations.filter(r => r.categoryId !== id),
    });
    setReservationForm(f => ({ ...f, categoryId: categories[0]?.id || '' }));
  };

  const addTopViewMarker = (kind: ExhibitionTopViewMarker['kind'] = 'entrance') => {
    if (!editing) return;
    const preset = TOP_VIEW_MARKER_KIND_OPTIONS.find(option => option.value === kind) || TOP_VIEW_MARKER_KIND_OPTIONS[0];
    const marker: ExhibitionTopViewMarker = {
      id: newId(),
      kind,
      categoryId: editing.categories[0]?.id || '',
      title: preset.defaultTitle,
      description: '',
      x: kind === 'entrance' ? 12 : kind === 'exit' ? 88 : kind === 'conference' ? 50 : 24,
      y: kind === 'entrance' ? 50 : kind === 'exit' ? 50 : kind === 'conference' ? 12 : 24,
      color: preset.color,
      opacity: 88,
      url: '',
    };
    upd({ topViewMarkers: [...(editing.topViewMarkers ?? []), marker] });
  };

  const updateTopViewMarker = (id: string, patch: Partial<ExhibitionTopViewMarker>) => {
    if (!editing) return;
    const nextMarkers = (editing.topViewMarkers ?? []).map(marker => {
      if (marker.id !== id) return marker;
      const next = { ...marker, ...patch };
      if (patch.kind) {
        const preset = TOP_VIEW_MARKER_KIND_OPTIONS.find(option => option.value === patch.kind);
        if (preset) {
          next.color = marker.color || preset.color;
          if (!marker.title.trim()) next.title = preset.defaultTitle;
        }
      }
      return next;
    });
    upd({ topViewMarkers: nextMarkers });
  };

  const removeTopViewMarker = (id: string) => {
    if (!editing) return;
    upd({ topViewMarkers: (editing.topViewMarkers ?? []).filter(marker => marker.id !== id) });
  };

  const addTopViewStructure = (kind: ExhibitionTopViewStructure['kind'] = 'column') => {
    if (!editing) return;
    const preset = TOP_VIEW_STRUCTURE_KIND_OPTIONS.find(option => option.value === kind) || TOP_VIEW_STRUCTURE_KIND_OPTIONS[0];
    const structure: ExhibitionTopViewStructure = {
      id: newId(),
      kind,
      categoryId: editing.categories[0]?.id || '',
      title: preset.defaultTitle,
      description: '',
      x: kind === 'pavilion' ? 30 : 50,
      y: kind === 'pavilion' ? 35 : 50,
      width: preset.width,
      height: preset.height,
      color: preset.color,
      opacity: preset.opacity,
    };
    upd({ topViewStructures: [...(editing.topViewStructures ?? []), structure] });
  };

  const updateTopViewStructure = (id: string, patch: Partial<ExhibitionTopViewStructure>) => {
    if (!editing) return;
    const nextStructures = (editing.topViewStructures ?? []).map(structure => {
      if (structure.id !== id) return structure;
      const next = { ...structure, ...patch };
      if (patch.kind) {
        const preset = TOP_VIEW_STRUCTURE_KIND_OPTIONS.find(option => option.value === patch.kind);
        if (preset) {
          next.color = preset.color;
          next.width = preset.width;
          next.height = preset.height;
          next.opacity = preset.opacity;
          if (!structure.title.trim()) next.title = preset.defaultTitle;
        }
      }
      return next;
    });
    upd({ topViewStructures: nextStructures });
  };

  const removeTopViewStructure = (id: string) => {
    if (!editing) return;
    upd({ topViewStructures: (editing.topViewStructures ?? []).filter(structure => structure.id !== id) });
  };

  const handleAddReservation = () => {
    if (!editing) return;
    const categoryId = reservationForm.categoryId || editing.categories[0]?.id;
    const category = editing.categories.find(c => c.id === categoryId);
    if (!category) {
      alert(`ابتدا ${isMall ? 'زون مغازه' : 'دسته غرفه'} تعریف کنید.`);
      return;
    }
    const companyName = reservationForm.companyName.trim();
    if (!companyName) {
      alert('نام شرکت / برند الزامی است.');
      return;
    }
    const boothNumber = nextBoothNumber(editing, category.id);
    if (boothNumber == null) {
      alert(`ظرفیت این ${isMall ? 'زون مغازه' : 'دسته غرفه'} تکمیل شده است.`);
      return;
    }
    const reservation: ExhibitionReservation = {
      id: newId(),
      categoryId: category.id,
      boothNumber,
      companyName,
      contactName: reservationForm.contactName.trim(),
      phone: reservationForm.phone.trim(),
      city: reservationForm.city.trim(),
      products: reservationForm.products.trim(),
      logoUrl: reservationForm.logoUrl.trim(),
      storeUrl: reservationForm.storeUrl.trim(),
      reservationStatus: reservationForm.reservationStatus,
      amountPaid: reservationForm.amountPaid.trim(),
      amountRemaining: reservationForm.amountRemaining.trim(),
      paymentNote: reservationForm.paymentNote.trim(),
      reservedAt: Date.now(),
    };
    upd({ reservations: [...editing.reservations, reservation] });
    setReservationForm(f => ({
      ...f,
      companyName: '',
      contactName: '',
      phone: '',
      city: '',
      products: '',
      logoUrl: '',
      storeUrl: '',
      amountPaid: '',
      amountRemaining: '',
      paymentNote: '',
    }));
  };

  const acceptOnlineReservationRequest = async (request: ExhibitionPublicReservationRequest) => {
    if (!editing) return;
    const category = editing.categories.find(c => c.id === request.categoryId);
    if (!category) {
      alert(`${isMall ? 'زون' : 'دسته'} این درخواست دیگر در نقشه وجود ندارد.`);
      return;
    }
    const taken = editing.reservations.some(
      r => r.categoryId === request.categoryId && r.boothNumber === request.boothNumber,
    );
    if (taken) {
      alert(`${unitLabel} ${request.boothCode} قبلاً رزرو شده است.`);
      return;
    }
    const reservation: ExhibitionReservation = {
      id: newId(),
      categoryId: request.categoryId,
      boothNumber: request.boothNumber,
      companyName: request.companyName.trim(),
      contactName: request.contactName.trim(),
      phone: request.phone.trim(),
      city: request.city.trim(),
      products: [request.activityType, request.products].filter(Boolean).join(' / '),
      logoUrl: '',
      storeUrl: request.website?.trim() || '',
      reservationStatus: 'reserved',
      amountPaid: '',
      amountRemaining: '',
      paymentNote: request.notes?.trim() || 'Online temporary reservation request',
      reservedAt: Date.now(),
    };
    upd({ reservations: [...editing.reservations, reservation] });
    try {
      await onReviewPublicReservationRequest?.(request, 'accepted');
    } catch {
      alert('رزرو به لیست اضافه شد، اما وضعیت درخواست آنلاین در Firebase آپدیت نشد.');
    }
  };

  const rejectOnlineReservationRequest = async (request: ExhibitionPublicReservationRequest) => {
    if (!confirm(`درخواست رزرو ${request.boothCode} برای «${request.companyName}» رد شود؟`)) return;
    try {
      await onReviewPublicReservationRequest?.(request, 'rejected');
    } catch {
      alert('آپدیت وضعیت درخواست انجام نشد.');
    }
  };

  const fillHalfPayment = (target: 'form' | string) => {
    if (!editing?.boothFee?.trim()) return;
    const fee = parseAmountNumber(editing.boothFee);
    if (fee === null || fee <= 0) return;
    const half = Math.round((fee / 2) * 100) / 100;
    const rest = Math.round((fee - half) * 100) / 100;
    const paid = parseAmountDigits(String(half));
    const rem = parseAmountDigits(String(rest));
    if (target === 'form') {
      setReservationForm(f => ({ ...f, amountPaid: paid, amountRemaining: rem }));
      return;
    }
    upd({
      reservations: updateReservation(editing.reservations, target, {
        amountPaid: paid,
        amountRemaining: rem,
      }),
    });
  };

  const openReservationEdit = (reservation: ExhibitionReservation) => {
    setEditingReservationId(reservation.id);
    setReservationEditForm({
      companyName: reservation.companyName,
      contactName: reservation.contactName,
      phone: reservation.phone,
      city: reservation.city,
      products: reservation.products,
      logoUrl: reservation.logoUrl ?? '',
      storeUrl: reservation.storeUrl ?? '',
      reservationStatus: reservation.reservationStatus,
      amountPaid: reservation.amountPaid,
      amountRemaining: reservation.amountRemaining,
      paymentNote: reservation.paymentNote,
    });
  };

  const closeReservationEdit = () => {
    setEditingReservationId(null);
    setReservationEditForm(null);
  };

  const saveReservationEdit = () => {
    if (!editing || !editingReservationId || !reservationEditForm) return;
    const companyName = reservationEditForm.companyName.trim();
    if (!companyName) {
      alert('نام شرکت / برند الزامی است.');
      return;
    }
    upd({
      reservations: updateReservation(editing.reservations, editingReservationId, {
        companyName,
        contactName: reservationEditForm.contactName.trim(),
        phone: reservationEditForm.phone.trim(),
        city: reservationEditForm.city.trim(),
        products: reservationEditForm.products.trim(),
        logoUrl: reservationEditForm.logoUrl.trim(),
        storeUrl: reservationEditForm.storeUrl.trim(),
        reservationStatus: reservationEditForm.reservationStatus,
        amountPaid: reservationEditForm.amountPaid,
        amountRemaining: reservationEditForm.amountRemaining,
        paymentNote: reservationEditForm.paymentNote.trim(),
      }),
    });
    closeReservationEdit();
  };

  const handleExportStory = async () => {
    if (!editing) return;
    setExporting(true);
    try {
      const saved = saveEvent(editing);
      await downloadExhibitionStory(saved);
    } catch (err) {
      console.error('Exhibition story export failed:', err);
      alert('خروجی تصویر انجام نشد. دوباره تلاش کنید.');
    } finally {
      setExporting(false);
    }
  };

  const openStoryPreview = async () => {
    if (!editing) return;
    setExporting(true);
    try {
      const blob = await renderExhibitionStoryPng(normalizeExhibitionEvent(editing), { scale: 1 });
      if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
      setStoryPreviewUrl(URL.createObjectURL(blob));
    } catch {
      alert('پیش‌نمایش در دسترس نیست.');
    } finally {
      setExporting(false);
    }
  };

  const handlePublishOnline = async () => {
    if (!editing) return;
    if (!onPublishOnline) {
      setOnlineLinkInfo({
        url: '',
        uploading: false,
        error: 'برای ساخت لینک آنلاین باید وارد حساب کاربری متصل به Firebase باشید.',
      });
      return;
    }
    setOnlineLinkInfo({ url: '', uploading: true });
    try {
      const saved = saveEvent(editing);
      const info = await onPublishOnline(saved, {
        master: onlineMasterMode,
        existingShortCode: saved.onlineMasterLink?.shortCode,
        existingStoragePath: saved.onlineMasterLink?.storagePath,
        existingCatalogLinkId: saved.onlineMasterLink?.catalogLinkId,
      });
      if (onlineMasterMode && info.shortCode && info.shortUrl && info.storagePath) {
        const next = saveEvent({
          ...saved,
          onlineMasterLink: {
            shortCode: info.shortCode,
            shortUrl: info.shortUrl,
            storagePath: info.storagePath,
            fullUrl: info.url,
            catalogLinkId: info.catalogLinkId || saved.onlineMasterLink?.catalogLinkId || '',
            updatedAt: Date.now(),
          },
        });
        setEditing(next);
      }
      setOnlineLinkInfo({ ...info, uploading: false });
    } catch (err: any) {
      setOnlineLinkInfo({
        url: '',
        uploading: false,
        error: err?.message || String(err) || 'ساخت لینک آنلاین انجام نشد.',
      });
    }
  };

  const handlePublishTopView = async () => {
    if (!editing) return;
    if (!onPublishTopView) {
      setTopViewLinkInfo({
        url: '',
        uploading: false,
        error: 'برای ساخت لینک Top View باید وارد حساب کاربری متصل به Firebase باشید.',
      });
      return;
    }
    setTopViewLinkInfo({ url: '', uploading: true });
    try {
      const saved = saveEvent(editing);
      const info = await onPublishTopView(saved, {
        master: topViewMasterMode,
        existingShortCode: saved.topViewMasterLink?.shortCode,
        existingStoragePath: saved.topViewMasterLink?.storagePath,
        existingCatalogLinkId: saved.topViewMasterLink?.catalogLinkId,
      });
      if (topViewMasterMode && info.shortCode && info.shortUrl && info.storagePath) {
        const next = saveEvent({
          ...saved,
          topViewMasterLink: {
            shortCode: info.shortCode,
            shortUrl: info.shortUrl,
            storagePath: info.storagePath,
            fullUrl: info.url,
            catalogLinkId: info.catalogLinkId || saved.topViewMasterLink?.catalogLinkId || '',
            updatedAt: Date.now(),
          },
        });
        setEditing(next);
      }
      setTopViewLinkInfo({ ...info, uploading: false });
    } catch (err: any) {
      setTopViewLinkInfo({
        url: '',
        uploading: false,
        error: err?.message || String(err) || 'ساخت لینک Top View انجام نشد.',
      });
    }
  };

  const copyOnlineLink = async () => {
    const link = onlineLinkInfo?.shortUrl || onlineLinkInfo?.url;
    if (!link) return;
    try {
      await navigator.clipboard?.writeText(link);
      alert('لینک کپی شد.');
    } catch {
      prompt('لینک آنلاین:', link);
    }
  };

  const copyTopViewLink = async () => {
    const link = topViewLinkInfo?.shortUrl || topViewLinkInfo?.url;
    if (!link) return;
    try {
      await navigator.clipboard?.writeText(link);
      alert('لینک Top View کپی شد.');
    } catch {
      prompt('Top View link:', link);
    }
  };

  if (subView === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              {moduleTitle} — {isMall ? 'اجاره مغازه‌ها' : 'رزرو غرفه‌های نمایشگاهی'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isMall ? 'تعریف پاساژ، طبقه/زون، اجاره مغازه و نقشه Top View پاساژ' : 'تعریف نمایشگاه، دسته‌بندی غرفه‌ها، رزرو غرفه و خروجی استوری اینستاگرام'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const blank = makeBlankExhibitionEvent(variant);
              setEditing(blank);
              setEditorTab('setup');
              setReservationForm({
                categoryId: blank.categories[0].id,
                companyName: '',
                contactName: '',
                phone: '',
                city: '',
                products: '',
                logoUrl: '',
                storeUrl: '',
                reservationStatus: 'confirmed',
                amountPaid: '',
                amountRemaining: '',
                paymentNote: '',
              });
              setOnlineLinkInfo(null);
              setTopViewLinkInfo(null);
              setSubView('editor');
            }}
            className="flex items-center gap-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg px-4 py-2 font-medium"
          >
            <Plus className="w-4 h-4" /> {isMall ? 'پاساژ جدید' : 'نمایشگاه جدید'}
          </button>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">هنوز {isMall ? 'پاساژی' : 'نمایشگاهی'} تعریف نشده است.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {events.map(event => {
              const normalized = normalizeExhibitionEvent(event);
              const total = normalized.categories.reduce((sum, c) => sum + c.boothCount, 0);
              const pct = total ? Math.round((normalized.reservations.length / total) * 100) : 0;
              return (
                <div
                  key={normalized.id}
                  className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm"
                >
                  <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-purple-500 via-fuchsia-500 to-cyan-400" />
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{normalized.title || 'بدون عنوان'}</div>
                    <p className="text-sm text-slate-500 mt-0.5 truncate">{normalized.subtitle || normalized.organizerName || '—'}</p>
                    {normalized.boothFee?.trim() ? (
                      <p className="text-xs text-amber-700 mt-1">
                        هزینه: {formatAmountWithCurrency(normalized.boothFee, normalized.boothFeeCurrency, normalized.boothFeeCurrencyLabel)}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
                      <span>{normalized.startDate}</span>
                      <span>·</span>
                      <span className={pct >= 100 ? 'text-red-600 font-medium' : ''}>
                        {normalized.reservations.length} / {total} {unitLabel}
                      </span>
                      <span>·</span>
                      <span>{normalized.categories.length} {isMall ? 'زون' : 'دسته'}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const normalizedEvent = normalizeExhibitionEvent(JSON.parse(JSON.stringify(normalized)) as ExhibitionEvent);
                        setEditing(normalizedEvent);
                        setEditorTab('setup');
                        setReservationForm({
                          categoryId: normalizedEvent.categories[0]?.id || '',
                          companyName: '',
                          contactName: '',
                          phone: '',
                          city: '',
                          products: '',
                          logoUrl: '',
                          storeUrl: '',
                          reservationStatus: 'confirmed',
                          amountPaid: '',
                          amountRemaining: '',
                          paymentNote: '',
                        });
                        setOnlineLinkInfo(null);
                        setTopViewLinkInfo(null);
                        setSubView('editor');
                      }}
                      className="text-sm text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50"
                    >
                      مدیریت
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(isMall ? 'این نقشه پاساژ حذف شود؟' : 'این نمایشگاه حذف شود؟')) onSaveEvents(events.filter(x => x.id !== normalized.id));
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!editing) return null;

  const editingReservation = editing.reservations.find(r => r.id === editingReservationId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3 flex-wrap sticky top-0 z-10">
        <button
          type="button"
          onClick={() => {
            setSubView('list');
            setEditing(null);
            closeReservationEdit();
            if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
            setStoryPreviewUrl(null);
            setOnlineLinkInfo(null);
            setTopViewLinkInfo(null);
          }}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> بازگشت
        </button>
        <span className="font-semibold text-slate-800 truncate flex-1 min-w-[120px]">{editing.title || newItemTitle}</span>
        <span className={`text-xs px-2 py-1 rounded-full border ${isFull ? 'bg-red-50 border-red-200 text-red-700' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
          {filled} / {totalBooths} {unitLabel}
        </span>
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
          قطعی {confirmedCount}
        </span>
        <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded-full">
          رزرو {reservedCount}
        </span>
        <button type="button" onClick={openStoryPreview} disabled={exporting} className="flex items-center gap-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50">
          <ImageIcon className="w-4 h-4" /> پیش‌نمایش استوری
        </button>
        <button type="button" onClick={handleExportStory} disabled={exporting} className="flex items-center gap-1 text-sm bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 text-white rounded-lg px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
          <Download className="w-4 h-4" />{' '}
          {exporting ? '…' : `دانلود استوری 8K (${EXHIBITION_STORY_EXPORT_WIDTH}×${EXHIBITION_STORY_EXPORT_HEIGHT})`}
        </button>
        <button type="button" onClick={handlePublishOnline} disabled={onlineLinkInfo?.uploading} className="flex items-center gap-1 text-sm bg-slate-900 text-white rounded-lg px-3 py-1.5 hover:bg-slate-800 disabled:opacity-50">
          {onlineLinkInfo?.uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          {onlineLinkInfo?.uploading ? 'در حال ساخت...' : onlineMasterMode && editing.onlineMasterLink ? 'آپدیت لینک مادر آنلاین' : 'ساخت لینک آنلاین + رزرو'}
        </button>
        <button type="button" onClick={handlePublishTopView} disabled={topViewLinkInfo?.uploading} className="flex items-center gap-1 text-sm bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white rounded-lg px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
          {topViewLinkInfo?.uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {topViewLinkInfo?.uploading ? 'در حال ساخت...' : topViewMasterMode && editing.topViewMasterLink ? `آپدیت لینک مادر ${topViewLinkLabel}` : topViewLinkLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            saveEvent(editing);
            setSubView('list');
            setEditing(null);
          }}
          className="flex items-center gap-1 text-sm bg-purple-600 text-white rounded-lg px-3 py-1.5"
        >
          <Save className="w-4 h-4" /> ذخیره
        </button>
      </div>

      {onlineLinkInfo && !onlineLinkInfo.uploading ? (
        onlineLinkInfo.error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {onlineLinkInfo.error}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-xl border border-purple-300/30 p-4 flex flex-col md:flex-row md:items-center gap-4">
            {onlineLinkInfo.qr ? (
              <img src={onlineLinkInfo.qr} alt="QR code" className="w-24 h-24 rounded-xl bg-white p-1 shrink-0" />
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-1">لینک آنلاین {isMall ? 'Tohid Meta Mall' : 'نمایشگاه'} آماده شد</p>
              <a
                href={onlineLinkInfo.shortUrl || onlineLinkInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-200 break-all hover:underline"
                dir="ltr"
              >
                {onlineLinkInfo.shortUrl || onlineLinkInfo.url}
              </a>
              <p className="text-[11px] text-slate-300 mt-1">
                {isMall ? 'این صفحه نقشه از بالا، مغازه‌های اجاره‌شده و لینک فروشگاه هر برند را نمایش می‌دهد.' : 'این صفحه همان نقشه Top View را دارد و بازدیدکننده می‌تواند غرفه خالی را برای بررسی، موقت رزرو کند.'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={copyOnlineLink} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/15 rounded-lg px-3 py-2">
                <Copy className="w-3.5 h-3.5" /> کپی
              </button>
              <a href={onlineLinkInfo.shortUrl || onlineLinkInfo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg px-3 py-2">
                <ExternalLink className="w-3.5 h-3.5" /> باز کردن
              </a>
            </div>
          </div>
        )
      ) : null}

      {topViewLinkInfo && !topViewLinkInfo.uploading ? (
        topViewLinkInfo.error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {topViewLinkInfo.error}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-cyan-950 via-indigo-950 to-purple-950 text-white rounded-xl border border-cyan-300/30 p-4 flex flex-col md:flex-row md:items-center gap-4">
            {topViewLinkInfo.qr ? (
              <img src={topViewLinkInfo.qr} alt="Top View QR code" className="w-24 h-24 rounded-xl bg-white p-1 shrink-0" />
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-1">{isMall ? 'Mall Top View link' : 'Creative Top View Hall link'} آماده شد</p>
              <a
                href={topViewLinkInfo.shortUrl || topViewLinkInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-200 break-all hover:underline"
                dir="ltr"
              >
                {topViewLinkInfo.shortUrl || topViewLinkInfo.url}
              </a>
              <p className="text-[11px] text-slate-300 mt-1">
                    {isMall ? 'این لینک مخصوص معرفی مغازه‌های پاساژ است: نقشه از بالا، برند روی سقف مغازه و نوت تعاملی هر مستاجر.' : 'این لینک جداگانه مخصوص مشتریان خارجی است: سالن‌ها از بالا، لوگوی برند روی غرفه و نوت تعاملی شرکت‌ها.'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={copyTopViewLink} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/15 rounded-lg px-3 py-2">
                <Copy className="w-3.5 h-3.5" /> کپی
              </button>
              <a href={topViewLinkInfo.shortUrl || topViewLinkInfo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg px-3 py-2">
                <ExternalLink className="w-3.5 h-3.5" /> باز کردن
              </a>
            </div>
          </div>
        )
      ) : null}

      <div className="grid md:grid-cols-2 gap-3">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={onlineMasterMode}
            onChange={e => setOnlineMasterMode(e.target.checked)}
            className="mt-1 accent-slate-900"
          />
          <span>
            <span className="block font-semibold text-slate-800">لینک آنلاین مادر</span>
            <span className="block text-xs text-slate-500 leading-relaxed">
              اگر روشن باشد، QR همین لینک برای آپدیت‌های بعدی ثابت می‌ماند.
              {editing.onlineMasterLink?.shortUrl ? (
                <a href={editing.onlineMasterLink.shortUrl} target="_blank" rel="noopener noreferrer" className="block text-cyan-700 break-all mt-1" dir="ltr">
                  {editing.onlineMasterLink.shortUrl}
                </a>
              ) : null}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={topViewMasterMode}
            onChange={e => setTopViewMasterMode(e.target.checked)}
            className="mt-1 accent-cyan-600"
          />
          <span>
            <span className="block font-semibold text-slate-800">لینک مادر Top View</span>
            <span className="block text-xs text-slate-500 leading-relaxed">
              برای QR چاپ‌شده یا تبلیغات ثابت، همان لینک را بعداً با نقشه جدید آپدیت کن.
              {editing.topViewMasterLink?.shortUrl ? (
                <a href={editing.topViewMasterLink.shortUrl} target="_blank" rel="noopener noreferrer" className="block text-cyan-700 break-all mt-1" dir="ltr">
                  {editing.topViewMasterLink.shortUrl}
                </a>
              ) : null}
            </span>
          </span>
        </label>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-1 flex flex-wrap gap-1 w-fit">
        <button
          type="button"
          onClick={() => setEditorTab('setup')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            editorTab === 'setup'
              ? 'bg-purple-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          اطلاعات و رزرو {unitLabel}‌ها
        </button>
        <button
          type="button"
          onClick={() => setEditorTab('topview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
            editorTab === 'topview'
              ? 'bg-cyan-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          طراحی نقشه Top View
        </button>
      </div>

      {editorTab === 'topview' ? (
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-4">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    المان‌های نقشه Top View
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    ورودی، سالن کنفرانس، انتهای نمایشگاه، راهنمای مسیر و تابلوهای تبلیغاتی را روی نقشه مشخص کن.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mb-4">
                {TOP_VIEW_MARKER_KIND_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => addTopViewMarker(option.value)}
                    className="text-xs rounded-lg border border-slate-200 px-3 py-2 text-right hover:bg-cyan-50 hover:border-cyan-200"
                  >
                    + {option.label}
                  </button>
                ))}
              </div>
              {(editing.topViewMarkers ?? []).length === 0 ? (
                <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl p-5 text-center">
                  هنوز المانی روی نقشه تعریف نشده.
                </p>
              ) : (
                <div className="space-y-3 max-h-[36rem] overflow-y-auto pr-1">
                  {(editing.topViewMarkers ?? []).map(marker => {
                    const kindPreset = TOP_VIEW_MARKER_KIND_OPTIONS.find(option => option.value === marker.kind) || TOP_VIEW_MARKER_KIND_OPTIONS[0];
                    return (
                      <div key={marker.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={marker.kind}
                            onChange={e => {
                              const nextKind = e.target.value as ExhibitionTopViewMarker['kind'];
                              const preset = TOP_VIEW_MARKER_KIND_OPTIONS.find(option => option.value === nextKind);
                              updateTopViewMarker(marker.id, {
                                kind: nextKind,
                                title: marker.title || preset?.defaultTitle || '',
                                color: preset?.color || marker.color,
                              });
                            }}
                            className={inputCls}
                          >
                            {TOP_VIEW_MARKER_KIND_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <select
                            value={marker.categoryId}
                            onChange={e => updateTopViewMarker(marker.id, { categoryId: e.target.value })}
                            className={inputCls}
                          >
                            {editing.categories.map(category => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          value={marker.title}
                          onChange={e => updateTopViewMarker(marker.id, { title: e.target.value })}
                          className={inputCls}
                          dir="ltr"
                          placeholder={kindPreset.defaultTitle}
                        />
                        <textarea
                          value={marker.description}
                          onChange={e => updateTopViewMarker(marker.id, { description: e.target.value })}
                          className={inputCls}
                          rows={2}
                          dir="rtl"
                          placeholder="توضیح کوتاه برای نمایش روی نقشه یا تابلو"
                        />
                        {marker.kind === 'ad' || marker.kind === 'guide' ? (
                          <input
                            value={marker.url || ''}
                            onChange={e => updateTopViewMarker(marker.id, { url: e.target.value })}
                            className={inputCls}
                            dir="ltr"
                            placeholder="لینک اختیاری برای تابلو / راهنما"
                          />
                        ) : null}
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                          <div>
                            <label className={labelCls}>X: {marker.x}%</label>
                            <input type="range" min={0} max={100} value={marker.x} onChange={e => updateTopViewMarker(marker.id, { x: Number(e.target.value) })} className="w-full accent-cyan-600" />
                          </div>
                          <div>
                            <label className={labelCls}>Y: {marker.y}%</label>
                            <input type="range" min={0} max={100} value={marker.y} onChange={e => updateTopViewMarker(marker.id, { y: Number(e.target.value) })} className="w-full accent-cyan-600" />
                          </div>
                          <input type="color" value={marker.color} onChange={e => updateTopViewMarker(marker.id, { color: e.target.value })} className="w-11 h-10 rounded-lg border border-slate-200 bg-white" />
                        </div>
                        <div>
                          <label className={labelCls}>شفافیت: {marker.opacity ?? 88}%</label>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={marker.opacity ?? 88}
                            onChange={e => updateTopViewMarker(marker.id, { opacity: Number(e.target.value) })}
                            className="w-full accent-cyan-600"
                          />
                        </div>
                        <button type="button" onClick={() => removeTopViewMarker(marker.id)} className="text-xs text-red-600 hover:underline">
                          حذف این المان
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-amber-500" />
                    ستون‌ها، مرزبندی و پاویون‌ها
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    برای مشخص کردن مرز بین پاویون‌ها، ستون‌های وسط سالن یا محدوده‌هایی مثل Iran Pavilion و Turkey Pavilion استفاده کن.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-2 mb-4">
                {TOP_VIEW_STRUCTURE_KIND_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => addTopViewStructure(option.value)}
                    className="text-xs rounded-lg border border-slate-200 px-3 py-2 text-right hover:bg-amber-50 hover:border-amber-200"
                  >
                    + {option.label}
                  </button>
                ))}
              </div>
              {(editing.topViewStructures ?? []).length === 0 ? (
                <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl p-5 text-center">
                  هنوز ستون، خط مرزی یا پاویون تعریف نشده.
                </p>
              ) : (
                <div className="space-y-3 pr-1">
                  {(editing.topViewStructures ?? []).map(structure => {
                    const kindPreset = TOP_VIEW_STRUCTURE_KIND_OPTIONS.find(option => option.value === structure.kind) || TOP_VIEW_STRUCTURE_KIND_OPTIONS[0];
                    return (
                      <div key={structure.id} className="border border-slate-200 rounded-xl p-3 bg-amber-50/40 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={structure.kind}
                            onChange={e => updateTopViewStructure(structure.id, { kind: e.target.value as ExhibitionTopViewStructure['kind'] })}
                            className={inputCls}
                          >
                            {TOP_VIEW_STRUCTURE_KIND_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <select
                            value={structure.categoryId}
                            onChange={e => updateTopViewStructure(structure.id, { categoryId: e.target.value })}
                            className={inputCls}
                          >
                            {editing.categories.map(category => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          value={structure.title}
                          onChange={e => updateTopViewStructure(structure.id, { title: e.target.value })}
                          className={inputCls}
                          dir="ltr"
                          placeholder={kindPreset.defaultTitle}
                        />
                        <textarea
                          value={structure.description}
                          onChange={e => updateTopViewStructure(structure.id, { description: e.target.value })}
                          className={inputCls}
                          rows={2}
                          dir="rtl"
                          placeholder="مثلاً محدوده پاویون ایران، مرز غرفه‌های ترکیه، مسیر اصلی بازدیدکننده"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelCls}>X: {structure.x}%</label>
                            <input type="range" min={0} max={100} value={structure.x} onChange={e => updateTopViewStructure(structure.id, { x: Number(e.target.value) })} className="w-full accent-amber-500" />
                          </div>
                          <div>
                            <label className={labelCls}>Y: {structure.y}%</label>
                            <input type="range" min={0} max={100} value={structure.y} onChange={e => updateTopViewStructure(structure.id, { y: Number(e.target.value) })} className="w-full accent-amber-500" />
                          </div>
                          <div>
                            <label className={labelCls}>عرض: {structure.width}%</label>
                            <input type="range" min={1} max={100} value={structure.width} onChange={e => updateTopViewStructure(structure.id, { width: Number(e.target.value) })} className="w-full accent-amber-500" />
                          </div>
                          <div>
                            <label className={labelCls}>ارتفاع: {structure.height}%</label>
                            <input type="range" min={1} max={100} value={structure.height} onChange={e => updateTopViewStructure(structure.id, { height: Number(e.target.value) })} className="w-full accent-amber-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                          <div>
                            <label className={labelCls}>شفافیت: {structure.opacity}%</label>
                            <input type="range" min={5} max={100} value={structure.opacity} onChange={e => updateTopViewStructure(structure.id, { opacity: Number(e.target.value) })} className="w-full accent-amber-500" />
                          </div>
                          <input type="color" value={structure.color} onChange={e => updateTopViewStructure(structure.id, { color: e.target.value })} className="w-11 h-10 rounded-lg border border-slate-200 bg-white" />
                        </div>
                        <button type="button" onClick={() => removeTopViewStructure(structure.id)} className="text-xs text-red-600 hover:underline">
                          حذف این سازه
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 text-white lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] overflow-y-auto">
            <h3 className="font-semibold mb-3">پیش‌نمایش جایگذاری روی سالن‌ها</h3>
            <div className="space-y-4">
              {editing.categories.map(category => {
                const markers = (editing.topViewMarkers ?? []).filter(marker => marker.categoryId === category.id);
                const structures = (editing.topViewStructures ?? []).filter(structure => structure.categoryId === category.id);
                const cols = topViewFloorCols(category.boothCount);
                const rows = Math.ceil(category.boothCount / cols);
                const previewCells = Array.from({ length: category.boothCount }, (_, i) => i + 1);
                return (
                  <div key={category.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">Hall Preview</p>
                        <h4 className="font-bold">{category.name}</h4>
                      </div>
                      <span className="text-xs text-slate-400">{category.boothCount} booth · {structures.length} structure · {markers.length} marker</span>
                    </div>
                    <div
                      className="relative rounded-2xl border border-white/10 overflow-hidden bg-[linear-gradient(135deg,rgba(15,23,42,.95),rgba(30,41,59,.72))]"
                      style={{ minHeight: Math.max(260, rows * 24 + 68) }}
                    >
                      {structures.map(structure => {
                        const preset = TOP_VIEW_STRUCTURE_KIND_OPTIONS.find(option => option.value === structure.kind);
                        const isPavilion = structure.kind === 'pavilion';
                        return (
                          <div
                            key={structure.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 border text-white flex items-center justify-center text-center px-2 ${
                              isPavilion
                                ? 'rounded-2xl border-dashed font-black'
                                : structure.kind === 'divider'
                                  ? 'rounded-full font-bold'
                                  : 'rounded-2xl font-bold'
                            }`}
                            style={{
                              left: `${structure.x}%`,
                              top: `${structure.y}%`,
                              width: `${structure.width}%`,
                              height: `${structure.height}%`,
                              minWidth: structure.kind === 'column' ? 24 : undefined,
                              minHeight: structure.kind === 'column' ? 24 : undefined,
                              backgroundColor: hexToRgba(structure.color, structure.opacity),
                              borderColor: structure.color,
                              zIndex: isPavilion ? 1 : 3,
                            }}
                            title={structure.description}
                          >
                            <span className="text-[10px] leading-tight drop-shadow">
                              {structure.title || preset?.defaultTitle}
                            </span>
                          </div>
                        );
                      })}
                      <div className="absolute inset-5 grid gap-1.5 opacity-45" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                        {previewCells.map(num => (
                          <span key={num} className="rounded-md border border-white/10 bg-white/10 text-[8px] text-white/45 flex items-center justify-center">
                            {num}
                          </span>
                        ))}
                      </div>
                      {markers.map(marker => {
                        const preset = TOP_VIEW_MARKER_KIND_OPTIONS.find(option => option.value === marker.kind);
                        return (
                          <div
                            key={marker.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl px-2.5 py-2 text-[10px] font-bold shadow-lg max-w-[140px]"
                            style={{ left: `${marker.x}%`, top: `${marker.y}%`, backgroundColor: hexToRgba(marker.color, marker.opacity ?? 88), border: `1px solid ${marker.color}`, zIndex: 5 }}
                            title={marker.description}
                          >
                            <div className="text-white leading-tight">{marker.title || preset?.defaultTitle}</div>
                            <div className="text-white/70 text-[9px]">{preset?.label.split(' / ')[0]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              اطلاعات {isMall ? 'پاساژ / متامال' : 'نمایشگاه'}
            </h3>
            <div>
              <label className={labelCls}>تایتل {isMall ? 'پاساژ' : 'نمایشگاه'}</label>
              <input value={editing.title} onChange={e => upd({ title: e.target.value })} className={inputCls} dir="rtl" placeholder={isMall ? 'مثلاً Tohid Meta Mall - Leasing' : 'مثلاً نمایشگاه فرصت‌های صادراتی ۲۰۲۶'} />
            </div>
            <div>
              <label className={labelCls}>زیرعنوان / شعار</label>
              <input value={editing.subtitle} onChange={e => upd({ subtitle: e.target.value })} className={inputCls} dir="rtl" placeholder={isMall ? 'مثلاً نقشه اجاره مغازه‌های پاساژ توحید متامال' : 'مثلاً رزرو غرفه‌های تخصصی صادرات، صنعت و فناوری'} />
            </div>
            <div>
              <label className={labelCls}>برگزارکننده</label>
              <input value={editing.organizerName} onChange={e => upd({ organizerName: e.target.value })} className={inputCls} dir="rtl" />
            </div>
            <div>
              <label className={labelCls}>مکان برگزاری</label>
              <input value={editing.location} onChange={e => upd({ location: e.target.value })} className={inputCls} dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>تاریخ شروع</label>
                <input value={editing.startDate} onChange={e => upd({ startDate: e.target.value })} className={inputCls} dir="rtl" />
              </div>
              <div>
                <label className={labelCls}>تاریخ پایان</label>
                <input value={editing.endDate} onChange={e => upd({ endDate: e.target.value })} className={inputCls} dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>عنوان مبلغ در استوری</label>
                <input value={editing.boothFeeLabel ?? (isMall ? 'اجاره مغازه' : 'هزینه غرفه')} onChange={e => upd({ boothFeeLabel: e.target.value })} className={inputCls} dir="rtl" />
              </div>
              <div>
                <label className={labelCls}>مبلغ {unitLabel}</label>
                <input value={formatAmountDisplay(editing.boothFee)} onChange={e => upd({ boothFee: onAmountInput(e.target.value) })} className={inputCls} dir="ltr" placeholder="1,500,000" />
              </div>
              <div>
                <label className={labelCls}>ارز</label>
                <select
                  value={editing.boothFeeCurrency}
                  onChange={e => {
                    const code = e.target.value as EducationFeeCurrency;
                    upd({ boothFeeCurrency: code, boothFeeCurrencyLabel: currencyShort(code) });
                  }}
                  className={inputCls}
                >
                  {EDUCATION_CURRENCY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>نمایش ارز در استوری و لیست</label>
              <input value={editing.boothFeeCurrencyLabel ?? currencyShort(editing.boothFeeCurrency)} onChange={e => upd({ boothFeeCurrencyLabel: e.target.value })} className={inputCls} dir="rtl" />
            </div>
            <div className="border border-purple-200 rounded-xl p-4 space-y-3 bg-purple-50/40">
              <label className={labelCls + ' mb-0'}>پس‌زمینه گرافیکی استوری</label>
              {editing.storyBackgroundUrl ? (
                <div className="relative rounded-lg overflow-hidden h-32">
                  <img src={editing.storyBackgroundUrl} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => upd({ storyBackgroundUrl: '' })} className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
              <input type="file" accept="image/*" className="text-sm w-full" onChange={handleBackgroundChange} />
              <div>
                <span className="text-xs text-slate-500">شفافیت عکس: {editing.storyBackgroundOpacity ?? 35}%</span>
                <input type="range" min={0} max={100} value={editing.storyBackgroundOpacity ?? 35} onChange={e => upd({ storyBackgroundOpacity: Number(e.target.value) })} className="w-full accent-purple-600" />
              </div>
            </div>
            <div className="border border-indigo-200 rounded-xl p-4 space-y-3 bg-indigo-50/40">
              <div className="flex items-center justify-between gap-2">
                <label className={labelCls + ' mb-0'}>متن و فاصله بالای عکس استوری</label>
                <button
                  type="button"
                  onClick={() => upd({
                    storyHeaderText: defaultStoryHeaderText,
                    storyHeaderTitleGapPx: 12,
                    storyTitleMetaGapPx: 8,
                  })}
                  className="text-[11px] font-bold text-indigo-700 hover:underline"
                >
                  ریست
                </button>
              </div>
              <input
                value={editing.storyHeaderText ?? ''}
                onChange={e => upd({ storyHeaderText: e.target.value })}
                className={inputCls}
                dir="rtl"
                placeholder={defaultStoryHeaderText}
              />
              <p className="text-[10px] text-slate-500">
                این متن همان نوشته کوچک بالای «عنوان نمایشگاه» در خروجی عکس است. اگر خالی باشد، در خروجی نمایش داده نمی‌شود.
              </p>
              <div>
                <span className="text-xs text-slate-500">فاصله تیتر کوچک تا عنوان: {storyHeaderTitleGapPx}px</span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={storyHeaderTitleGapPx}
                  onChange={e => upd({ storyHeaderTitleGapPx: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>
              <div>
                <span className="text-xs text-slate-500">فاصله عنوان تا توضیحات/تاریخ: {storyTitleMetaGapPx}px</span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={storyTitleMetaGapPx}
                  onChange={e => upd({ storyTitleMetaGapPx: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>نوت استوری</label>
              <textarea value={editing.storyFootNote ?? ''} onChange={e => upd({ storyFootNote: e.target.value })} rows={3} className={inputCls} dir="rtl" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-purple-600" />
                {isMall ? 'طبقه‌ها و زون‌های مغازه‌ها' : 'دسته‌بندی غرفه‌ها'}
              </h3>
              <button type="button" onClick={addCategory} className="text-xs text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 font-medium">
                + دسته جدید
              </button>
            </div>
            <div className="space-y-3">
              {editing.categories.map(category => {
                const stats = categoryStats(editing, category.id);
                return (
                  <div key={category.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={category.name} onChange={e => patchCategory(category.id, { name: e.target.value })} className={inputCls} dir="rtl" placeholder="نام دسته" />
                      <input value={category.prefix} onChange={e => patchCategory(category.id, { prefix: e.target.value.toUpperCase().slice(0, 4) })} className={inputCls} dir="ltr" placeholder="Prefix" />
                      <input value={category.description} onChange={e => patchCategory(category.id, { description: e.target.value })} className={inputCls + ' col-span-2'} dir="rtl" placeholder="توضیح کوتاه دسته / سالن" />
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      <div>
                        <label className={labelCls}>تعداد {unitLabel}</label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={category.boothCount}
                          onChange={e => patchCategory(category.id, { boothCount: Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1)) })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>رنگ دسته</label>
                        <input type="color" value={category.color} onChange={e => patchCategory(category.id, { color: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200 bg-white" />
                      </div>
                      <button type="button" onClick={() => removeCategory(category.id)} className="text-red-500 p-2 rounded-lg hover:bg-red-50" title="حذف دسته">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      {stats.filled} / {category.boothCount} رزرو شده · نمونه کد: {boothCode(category, 1)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {currentOnlineRequests.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-200 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-500" />
                    درخواست‌های رزرو آنلاین غیرقطعی
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    اطلاعات کامل فقط در این پنل دیده می‌شود. روی لینک عمومی فقط نام کسب‌وکار و وضعیت رزرو موقت نمایش داده می‌شود.
                  </p>
                </div>
                <span className="text-xs font-black rounded-full bg-orange-100 text-orange-700 px-2.5 py-1">
                  جدید {newOnlineRequests.length}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {currentOnlineRequests.map(request => {
                  const category = editing.categories.find(c => c.id === request.categoryId);
                  const taken = editing.reservations.some(r => r.categoryId === request.categoryId && r.boothNumber === request.boothNumber);
                  const reviewed = request.reviewStatus === 'accepted' || request.reviewStatus === 'rejected';
                  return (
                    <div key={request.id} className="rounded-xl border border-orange-100 bg-orange-50/45 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900">{request.companyName}</p>
                          <p className="text-xs text-orange-700 font-semibold">
                            {request.boothCode} · {category?.name || request.categoryId}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black rounded-full px-2 py-1 ${
                          request.reviewStatus === 'accepted'
                            ? 'bg-emerald-100 text-emerald-700'
                            : request.reviewStatus === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                        }`}>
                          {request.reviewStatus === 'accepted' ? 'اضافه شد' : request.reviewStatus === 'rejected' ? 'رد شده' : 'جدید'}
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
                        <span>مسئول: {request.contactName || '-'}</span>
                        <span dir="ltr">تلفن: {request.phone || '-'}</span>
                        <span>شهر/کشور: {request.city || '-'}</span>
                        <span>فعالیت: {request.activityType || '-'}</span>
                        {request.email ? <span dir="ltr">Email: {request.email}</span> : null}
                        {request.website ? <span dir="ltr">Website: {request.website}</span> : null}
                      </div>
                      {request.products ? <p className="text-xs text-slate-700 leading-relaxed">محصولات/توضیح: {request.products}</p> : null}
                      {request.notes ? <p className="text-xs text-slate-500 leading-relaxed">یادداشت: {request.notes}</p> : null}
                      {!reviewed && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => acceptOnlineReservationRequest(request)}
                            disabled={taken || !onReviewPublicReservationRequest}
                            className="flex-1 rounded-lg bg-orange-500 text-white text-xs font-bold py-2 disabled:opacity-50 hover:bg-orange-600"
                          >
                            {taken ? `${unitLabel} قبلاً پر شده` : 'افزودن به رزرو موقت'}
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectOnlineReservationRequest(request)}
                            disabled={!onReviewPublicReservationRequest}
                            className="rounded-lg border border-red-200 text-red-600 text-xs font-bold px-3 py-2 disabled:opacity-50 hover:bg-red-50"
                          >
                            رد درخواست
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-600" />
              ثبت {isMall ? 'اجاره مغازه' : 'رزرو غرفه'}
            </h3>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => setReservationForm(f => ({ ...f, reservationStatus: 'confirmed' }))} className={`flex-1 text-sm py-2 rounded-lg border font-medium ${reservationForm.reservationStatus === 'confirmed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                قطعی (سبز)
              </button>
              <button type="button" onClick={() => setReservationForm(f => ({ ...f, reservationStatus: 'reserved' }))} className={`flex-1 text-sm py-2 rounded-lg border font-medium ${reservationForm.reservationStatus === 'reserved' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                رزرو موقت (نارنجی)
              </button>
            </div>
            <div className="mb-3">
              <label className={labelCls}>{isMall ? 'زون / طبقه مغازه' : 'دسته غرفه'}</label>
              <select value={selectedCategoryId} onChange={e => setReservationForm(f => ({ ...f, categoryId: e.target.value }))} className={inputCls}>
                {editing.categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({categoryStats(editing, c.id).filled}/{c.boothCount})</option>
                ))}
              </select>
            </div>
            {selectedCategoryFull ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                ظرفیت این دسته تکمیل شده است.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input placeholder="نام شرکت / برند" value={reservationForm.companyName} onChange={e => setReservationForm(f => ({ ...f, companyName: e.target.value }))} className={inputCls} dir="rtl" disabled={selectedCategoryFull} />
              <input placeholder={isMall ? 'نام مسئول مغازه' : 'نام مسئول غرفه'} value={reservationForm.contactName} onChange={e => setReservationForm(f => ({ ...f, contactName: e.target.value }))} className={inputCls} dir="rtl" disabled={selectedCategoryFull} />
              <input placeholder="شماره تماس" value={reservationForm.phone} onChange={e => setReservationForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} dir="ltr" disabled={selectedCategoryFull} />
              <input placeholder="شهر / کشور" value={reservationForm.city} onChange={e => setReservationForm(f => ({ ...f, city: e.target.value }))} className={inputCls} dir="rtl" disabled={selectedCategoryFull} />
            </div>
            <textarea placeholder="محصولات / حوزه فعالیت" value={reservationForm.products} onChange={e => setReservationForm(f => ({ ...f, products: e.target.value }))} rows={2} className={inputCls + ' mb-3'} dir="rtl" disabled={selectedCategoryFull} />
            <div className="border border-slate-200 rounded-xl p-3 mb-3 bg-slate-50/70">
              <label className={labelCls}>لوگوی شرکت برای لینک Top View</label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {reservationForm.logoUrl ? (
                    <img src={reservationForm.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 w-full space-y-2">
                  <input
                    placeholder="Logo URL یا بعد از آپلود خودکار پر می‌شود"
                    value={reservationForm.logoUrl}
                    onChange={e => setReservationForm(f => ({ ...f, logoUrl: e.target.value }))}
                    className={inputCls}
                    dir="ltr"
                    disabled={selectedCategoryFull}
                  />
                  <input type="file" accept="image/*" className="text-xs w-full" disabled={selectedCategoryFull} onChange={e => handleCompanyLogoChange(e, 'form')} />
                  {reservationForm.logoUrl ? (
                    <button type="button" onClick={() => setReservationForm(f => ({ ...f, logoUrl: '' }))} className="text-xs text-red-600 hover:underline">
                      حذف لوگو
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">در لینک Top View، این لوگو از بالا روی سقف {unitLabel} نمایش داده می‌شود.</p>
            </div>
            <input
              placeholder="لینک فروشگاه / کاتالوگ آنلاین شرکت (https://...)"
              value={reservationForm.storeUrl}
              onChange={e => setReservationForm(f => ({ ...f, storeUrl: e.target.value }))}
              className={inputCls + ' mb-3'}
              dir="ltr"
              disabled={selectedCategoryFull}
            />
            <p className="text-xs text-slate-500 mb-2 font-medium">پرداخت (پیش‌پرداخت / مانده)</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input placeholder="مبلغ پرداخت‌شده" value={formatAmountDisplay(reservationForm.amountPaid)} onChange={e => setReservationForm(f => ({ ...f, amountPaid: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" disabled={selectedCategoryFull} />
              <input placeholder="مانده حساب" value={formatAmountDisplay(reservationForm.amountRemaining)} onChange={e => setReservationForm(f => ({ ...f, amountRemaining: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" disabled={selectedCategoryFull} />
            </div>
            {editing.boothFee?.trim() ? (
              <button type="button" onClick={() => fillHalfPayment('form')} disabled={selectedCategoryFull} className="text-xs text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 mb-2 hover:bg-purple-50 w-full">
                نصف هزینه {unitLabel}: پرداخت‌شده / مانده (خودکار)
              </button>
            ) : null}
            <input placeholder="یادداشت پرداخت" value={reservationForm.paymentNote} onChange={e => setReservationForm(f => ({ ...f, paymentNote: e.target.value }))} className={inputCls + ' mb-3'} dir="rtl" disabled={selectedCategoryFull} />
            <button type="button" onClick={handleAddReservation} disabled={selectedCategoryFull} className={`w-full flex items-center justify-center gap-2 text-sm text-white rounded-lg py-2 disabled:opacity-50 ${reservationForm.reservationStatus === 'reserved' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
              <Plus className="w-4 h-4" />
              {reservationForm.reservationStatus === 'reserved' ? `${isMall ? 'رزرو موقت مغازه' : 'رزرو موقت غرفه'}` : `${isMall ? 'ثبت اجاره قطعی مغازه' : 'ثبت قطعی غرفه'}`}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">نقشه {unitLabel}‌ها</h3>
            <div className="flex gap-3 text-xs mb-4 justify-center flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> قطعی</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> رزرو موقت</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> خالی</span>
            </div>
            <div className="space-y-5">
              {boothMaps.map(map => (
                <div key={map.category.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                        <span className="w-3 h-3 rounded" style={{ backgroundColor: map.category.color }} />
                        {map.category.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{map.stats.filled} / {map.category.boothCount} {unitLabel}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 bg-slate-100 rounded-full px-2 py-1">{map.category.prefix}</span>
                  </div>
                  <div className="grid gap-1.5 justify-center" style={{ gridTemplateColumns: `repeat(${map.cols}, minmax(0, 1fr))` }}>
                    {map.cells.map(({ num, reservation }) => (
                      <button
                        key={num}
                        type="button"
                        title={reservation ? `${boothCode(map.category, num)} — ${reservation.companyName}` : `${boothCode(map.category, num)} — خالی`}
                        onClick={() => { if (reservation) openReservationEdit(reservation); }}
                        className={`min-h-[58px] rounded-md text-[9px] font-bold transition-all flex flex-col items-center justify-center p-0.5 leading-tight ${
                          reservation
                            ? reservation.reservationStatus === 'reserved'
                              ? 'bg-orange-500 text-white hover:bg-red-500 shadow-sm'
                              : 'bg-emerald-500 text-white hover:bg-red-500 shadow-sm'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 aspect-square hover:border-purple-200'
                        }`}
                      >
                        <span className="opacity-90">{boothCode(map.category, num)}</span>
                        {reservation ? (
                          <span className="font-normal text-[7px] w-full text-center px-0.5 break-words line-clamp-3 leading-[1.1] text-white">
                            {reservation.companyName}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">کلیک روی {unitLabel} پر = ویرایش اطلاعات {isMall ? 'اجاره' : 'رزرو'}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 max-h-[28rem] overflow-y-auto">
            <h3 className="font-semibold text-slate-800 mb-3">لیست {isMall ? 'اجاره‌ها' : 'رزروها'} ({filled})</h3>
            {editing.reservations.length === 0 ? (
              <p className="text-sm text-slate-400">هنوز رزروی ثبت نشده.</p>
            ) : (
              <div className="space-y-3">
                {[...editing.reservations]
                  .sort((a, b) => {
                    const ca = editing.categories.findIndex(c => c.id === a.categoryId);
                    const cb = editing.categories.findIndex(c => c.id === b.categoryId);
                    return ca === cb ? a.boothNumber - b.boothNumber : ca - cb;
                  })
                  .map(reservation => {
                    const category = editing.categories.find(c => c.id === reservation.categoryId);
                    return (
                      <div key={reservation.id} className={`border rounded-lg p-3 text-sm ${reservation.reservationStatus === 'reserved' ? 'border-orange-200 bg-orange-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2">
                            {reservation.logoUrl ? (
                              <img src={reservation.logoUrl} alt="" className="w-9 h-9 rounded-lg bg-white border border-slate-200 object-contain p-1 shrink-0" />
                            ) : null}
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-500">{category ? boothCode(category, reservation.boothNumber) : `#${reservation.boothNumber}`}</span>
                              <span className="font-semibold mr-2">{reservation.companyName}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${reservation.reservationStatus === 'reserved' ? 'bg-orange-200 text-orange-800' : 'bg-emerald-200 text-emerald-800'}`}>
                                {reservation.reservationStatus === 'reserved' ? 'رزرو موقت' : 'قطعی'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => openReservationEdit(reservation)} className="text-purple-600 p-1 hover:bg-purple-50 rounded" title="ویرایش"><Pencil className="w-4 h-4" /></button>
                            <button type="button" onClick={() => { if (confirm(`حذف رزرو ${reservation.companyName}؟`)) { upd({ reservations: editing.reservations.filter(x => x.id !== reservation.id) }); if (editingReservationId === reservation.id) closeReservationEdit(); } }} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2">
                          <span>{reservation.contactName || '—'}</span>
                          <span dir="ltr" className="text-left">{reservation.phone || '—'}</span>
                          <span>{reservation.city || '—'}</span>
                          <span>{category?.name || '—'}</span>
                        </div>
                        {reservation.products ? <p className="text-xs text-slate-500 mb-2 line-clamp-2">{reservation.products}</p> : null}
                        {reservation.storeUrl ? (
                          <a href={reservation.storeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-700 hover:underline break-all block mb-2" dir="ltr">
                            {reservation.storeUrl}
                          </a>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input value={formatAmountDisplay(reservation.amountPaid)} onChange={e => upd({ reservations: updateReservation(editing.reservations, reservation.id, { amountPaid: onAmountInput(e.target.value) }) })} className="border rounded px-2 py-1 text-xs" dir="ltr" placeholder="پرداخت‌شده" />
                          <input value={formatAmountDisplay(reservation.amountRemaining)} onChange={e => upd({ reservations: updateReservation(editing.reservations, reservation.id, { amountRemaining: onAmountInput(e.target.value) }) })} className="border rounded px-2 py-1 text-xs" dir="ltr" placeholder="مانده" />
                        </div>
                        {editing.boothFee?.trim() ? (
                          <button type="button" onClick={() => fillHalfPayment(reservation.id)} className="text-xs text-purple-700 border border-purple-200 rounded px-2 py-1 mb-2 hover:bg-purple-50 w-full">نصف هزینه غرفه (خودکار)</button>
                        ) : null}
                        <div className="flex gap-2 flex-wrap">
                          <button type="button" onClick={() => upd({ reservations: updateReservation(editing.reservations, reservation.id, { reservationStatus: 'confirmed' }) })} className={`text-xs px-2 py-1 rounded border ${reservation.reservationStatus === 'confirmed' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200'}`}>
                            قطعی
                          </button>
                          <button type="button" onClick={() => upd({ reservations: updateReservation(editing.reservations, reservation.id, { reservationStatus: 'reserved' }) })} className={`text-xs px-2 py-1 rounded border ${reservation.reservationStatus === 'reserved' ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200'}`}>
                            رزرو
                          </button>
                          <input value={reservation.paymentNote} onChange={e => upd({ reservations: updateReservation(editing.reservations, reservation.id, { paymentNote: e.target.value }) })} className="flex-1 min-w-[120px] border rounded px-2 py-1 text-xs" dir="rtl" placeholder="یادداشت" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {editingReservation && reservationEditForm ? (
            <div className="bg-white rounded-xl border-2 border-purple-300 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">ویرایش رزرو ({boothCode(editing.categories.find(c => c.id === editingReservation.categoryId) || { prefix: 'B' }, editingReservation.boothNumber)})</h3>
                <button type="button" onClick={closeReservationEdit} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input placeholder="نام شرکت / برند" value={reservationEditForm.companyName} onChange={e => setReservationEditForm(f => f && ({ ...f, companyName: e.target.value }))} className={inputCls} dir="rtl" />
                <input placeholder="نام مسئول غرفه" value={reservationEditForm.contactName} onChange={e => setReservationEditForm(f => f && ({ ...f, contactName: e.target.value }))} className={inputCls} dir="rtl" />
                <input placeholder="شماره تماس" value={reservationEditForm.phone} onChange={e => setReservationEditForm(f => f && ({ ...f, phone: e.target.value }))} className={inputCls} dir="ltr" />
                <input placeholder="شهر / کشور" value={reservationEditForm.city} onChange={e => setReservationEditForm(f => f && ({ ...f, city: e.target.value }))} className={inputCls} dir="rtl" />
              </div>
              <textarea placeholder="محصولات / حوزه فعالیت" value={reservationEditForm.products} onChange={e => setReservationEditForm(f => f && ({ ...f, products: e.target.value }))} rows={2} className={inputCls + ' mb-3'} dir="rtl" />
              <div className="border border-slate-200 rounded-xl p-3 mb-3 bg-slate-50/70">
                <label className={labelCls}>لوگوی شرکت برای لینک Top View</label>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {reservationEditForm.logoUrl ? (
                      <img src={reservationEditForm.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <input
                      placeholder="Logo URL یا بعد از آپلود خودکار پر می‌شود"
                      value={reservationEditForm.logoUrl}
                      onChange={e => setReservationEditForm(f => f && ({ ...f, logoUrl: e.target.value }))}
                      className={inputCls}
                      dir="ltr"
                    />
                    <input type="file" accept="image/*" className="text-xs w-full" onChange={e => handleCompanyLogoChange(e, 'edit')} />
                    {reservationEditForm.logoUrl ? (
                      <button type="button" onClick={() => setReservationEditForm(f => f && ({ ...f, logoUrl: '' }))} className="text-xs text-red-600 hover:underline">
                        حذف لوگو
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <input
                placeholder="لینک فروشگاه / کاتالوگ آنلاین شرکت (https://...)"
                value={reservationEditForm.storeUrl}
                onChange={e => setReservationEditForm(f => f && ({ ...f, storeUrl: e.target.value }))}
                className={inputCls + ' mb-3'}
                dir="ltr"
              />
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => setReservationEditForm(f => f && ({ ...f, reservationStatus: 'confirmed' }))} className={`flex-1 text-sm py-2 rounded-lg border ${reservationEditForm.reservationStatus === 'confirmed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200'}`}>قطعی</button>
                <button type="button" onClick={() => setReservationEditForm(f => f && ({ ...f, reservationStatus: 'reserved' }))} className={`flex-1 text-sm py-2 rounded-lg border ${reservationEditForm.reservationStatus === 'reserved' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-slate-200'}`}>رزرو موقت</button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input placeholder="پرداخت‌شده" value={formatAmountDisplay(reservationEditForm.amountPaid)} onChange={e => setReservationEditForm(f => f && ({ ...f, amountPaid: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" />
                <input placeholder="مانده" value={formatAmountDisplay(reservationEditForm.amountRemaining)} onChange={e => setReservationEditForm(f => f && ({ ...f, amountRemaining: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" />
              </div>
              <input placeholder="یادداشت پرداخت" value={reservationEditForm.paymentNote} onChange={e => setReservationEditForm(f => f && ({ ...f, paymentNote: e.target.value }))} className={inputCls + ' mb-3'} dir="rtl" />
              <div className="flex gap-2">
                <button type="button" onClick={saveReservationEdit} className="flex-1 bg-purple-600 text-white text-sm rounded-lg py-2">ذخیره تغییرات</button>
                <button type="button" onClick={() => { if (confirm(`حذف رزرو ${editingReservation.companyName}؟`)) { upd({ reservations: editing.reservations.filter(x => x.id !== editingReservationId) }); closeReservationEdit(); } }} className="text-sm text-red-600 border border-red-200 rounded-lg px-4 py-2">حذف</button>
              </div>
            </div>
          ) : null}

          {storyPreviewUrl ? (
            <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center">
              <p className="text-white text-xs mb-2 text-center">
                پیش‌نمایش ({EXHIBITION_STORY_WIDTH}×{EXHIBITION_STORY_HEIGHT}) — فایل دانلود {EXHIBITION_STORY_EXPORT_WIDTH}×{EXHIBITION_STORY_EXPORT_HEIGHT} PNG
              </p>
              <img src={storyPreviewUrl} alt="Story preview" className="rounded-lg shadow-2xl max-h-[420px] w-auto" style={{ aspectRatio: '9/16' }} />
            </div>
          ) : null}
        </div>
      </div>
      )}
    </div>
  );
});
