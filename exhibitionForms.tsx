import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Download,
  Image as ImageIcon,
  LayoutGrid,
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
  ExhibitionReservation,
  ExhibitionReservationStatus,
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

const BACKGROUND_MAX_BYTES = 5 * 1024 * 1024;
const CATEGORY_COLORS = ['#8b5cf6', '#06b6d4', '#f97316', '#22c55e', '#ec4899', '#eab308', '#14b8a6', '#ef4444'];

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeCategory(index: number): ExhibitionBoothCategory {
  return {
    id: newId(),
    name: index === 0 ? 'غرفه‌های عمومی' : `دسته ${index + 1}`,
    description: '',
    prefix: String.fromCharCode(65 + Math.min(25, index)),
    boothCount: 30,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  };
}

export function makeBlankExhibitionEvent(): ExhibitionEvent {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  return {
    id: String(now),
    title: '',
    subtitle: '',
    organizerName: '',
    location: '',
    startDate: today,
    endDate: today,
    boothFee: '',
    boothFeeLabel: 'هزینه غرفه',
    boothFeeCurrency: 'OMR',
    boothFeeCurrencyLabel: 'OMR',
    storyBackgroundUrl: '',
    storyBackgroundOpacity: 35,
    storyFootNote: 'برای انتخاب و رزرو غرفه، شماره غرفه موردنظر را اعلام کنید.',
    categories: [makeCategory(0)],
    reservations: [],
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

type Props = {
  events: ExhibitionEvent[];
  onSaveEvents: (events: ExhibitionEvent[]) => void;
};

export const ExhibitionFormsPanel = React.memo(function ExhibitionFormsPanel({ events, onSaveEvents }: Props) {
  const [subView, setSubView] = useState<'list' | 'editor'>('list');
  const [editing, setEditing] = useState<ExhibitionEvent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState({
    categoryId: '',
    companyName: '',
    contactName: '',
    phone: '',
    city: '',
    products: '',
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
      const cols = category.boothCount <= 20 ? 5 : category.boothCount <= 48 ? 8 : 10;
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
    upd({ categories: [...editing.categories, makeCategory(editing.categories.length)] });
  };

  const removeCategory = (id: string) => {
    if (!editing) return;
    if (editing.categories.length <= 1) {
      alert('حداقل یک دسته غرفه لازم است.');
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

  const handleAddReservation = () => {
    if (!editing) return;
    const categoryId = reservationForm.categoryId || editing.categories[0]?.id;
    const category = editing.categories.find(c => c.id === categoryId);
    if (!category) {
      alert('ابتدا دسته غرفه تعریف کنید.');
      return;
    }
    const companyName = reservationForm.companyName.trim();
    if (!companyName) {
      alert('نام شرکت / برند الزامی است.');
      return;
    }
    const boothNumber = nextBoothNumber(editing, category.id);
    if (boothNumber == null) {
      alert('ظرفیت این دسته غرفه تکمیل شده است.');
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
      amountPaid: '',
      amountRemaining: '',
      paymentNote: '',
    }));
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
    } catch {
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

  if (subView === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              Exhibition — رزرو غرفه‌های نمایشگاهی
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">تعریف نمایشگاه، دسته‌بندی غرفه‌ها، رزرو غرفه و خروجی استوری اینستاگرام</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const blank = makeBlankExhibitionEvent();
              setEditing(blank);
              setReservationForm(f => ({ ...f, categoryId: blank.categories[0].id }));
              setSubView('editor');
            }}
            className="flex items-center gap-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg px-4 py-2 font-medium"
          >
            <Plus className="w-4 h-4" /> نمایشگاه جدید
          </button>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">هنوز نمایشگاهی تعریف نشده است.</p>
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
                        {normalized.reservations.length} / {total} غرفه
                      </span>
                      <span>·</span>
                      <span>{normalized.categories.length} دسته</span>
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
                        setReservationForm(f => ({ ...f, categoryId: normalizedEvent.categories[0]?.id || '' }));
                        setSubView('editor');
                      }}
                      className="text-sm text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50"
                    >
                      مدیریت
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('این نمایشگاه حذف شود؟')) onSaveEvents(events.filter(x => x.id !== normalized.id));
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
          }}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> بازگشت
        </button>
        <span className="font-semibold text-slate-800 truncate flex-1 min-w-[120px]">{editing.title || 'نمایشگاه جدید'}</span>
        <span className={`text-xs px-2 py-1 rounded-full border ${isFull ? 'bg-red-50 border-red-200 text-red-700' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
          {filled} / {totalBooths} غرفه
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

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              اطلاعات نمایشگاه
            </h3>
            <div>
              <label className={labelCls}>تایتل نمایشگاه</label>
              <input value={editing.title} onChange={e => upd({ title: e.target.value })} className={inputCls} dir="rtl" placeholder="مثلاً نمایشگاه فرصت‌های صادراتی ۲۰۲۶" />
            </div>
            <div>
              <label className={labelCls}>زیرعنوان / شعار</label>
              <input value={editing.subtitle} onChange={e => upd({ subtitle: e.target.value })} className={inputCls} dir="rtl" placeholder="مثلاً رزرو غرفه‌های تخصصی صادرات، صنعت و فناوری" />
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
                <input value={editing.boothFeeLabel ?? 'هزینه غرفه'} onChange={e => upd({ boothFeeLabel: e.target.value })} className={inputCls} dir="rtl" />
              </div>
              <div>
                <label className={labelCls}>مبلغ غرفه</label>
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
            <div>
              <label className={labelCls}>نوت استوری</label>
              <textarea value={editing.storyFootNote ?? ''} onChange={e => upd({ storyFootNote: e.target.value })} rows={3} className={inputCls} dir="rtl" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-purple-600" />
                دسته‌بندی غرفه‌ها
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
                        <label className={labelCls}>تعداد غرفه</label>
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

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-600" />
              ثبت رزرو غرفه
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
              <label className={labelCls}>دسته غرفه</label>
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
              <input placeholder="نام مسئول غرفه" value={reservationForm.contactName} onChange={e => setReservationForm(f => ({ ...f, contactName: e.target.value }))} className={inputCls} dir="rtl" disabled={selectedCategoryFull} />
              <input placeholder="شماره تماس" value={reservationForm.phone} onChange={e => setReservationForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} dir="ltr" disabled={selectedCategoryFull} />
              <input placeholder="شهر / کشور" value={reservationForm.city} onChange={e => setReservationForm(f => ({ ...f, city: e.target.value }))} className={inputCls} dir="rtl" disabled={selectedCategoryFull} />
            </div>
            <textarea placeholder="محصولات / حوزه فعالیت" value={reservationForm.products} onChange={e => setReservationForm(f => ({ ...f, products: e.target.value }))} rows={2} className={inputCls + ' mb-3'} dir="rtl" disabled={selectedCategoryFull} />
            <p className="text-xs text-slate-500 mb-2 font-medium">پرداخت (پیش‌پرداخت / مانده)</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input placeholder="مبلغ پرداخت‌شده" value={formatAmountDisplay(reservationForm.amountPaid)} onChange={e => setReservationForm(f => ({ ...f, amountPaid: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" disabled={selectedCategoryFull} />
              <input placeholder="مانده حساب" value={formatAmountDisplay(reservationForm.amountRemaining)} onChange={e => setReservationForm(f => ({ ...f, amountRemaining: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" disabled={selectedCategoryFull} />
            </div>
            {editing.boothFee?.trim() ? (
              <button type="button" onClick={() => fillHalfPayment('form')} disabled={selectedCategoryFull} className="text-xs text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 mb-2 hover:bg-purple-50 w-full">
                نصف هزینه غرفه: پرداخت‌شده / مانده (خودکار)
              </button>
            ) : null}
            <input placeholder="یادداشت پرداخت" value={reservationForm.paymentNote} onChange={e => setReservationForm(f => ({ ...f, paymentNote: e.target.value }))} className={inputCls + ' mb-3'} dir="rtl" disabled={selectedCategoryFull} />
            <button type="button" onClick={handleAddReservation} disabled={selectedCategoryFull} className={`w-full flex items-center justify-center gap-2 text-sm text-white rounded-lg py-2 disabled:opacity-50 ${reservationForm.reservationStatus === 'reserved' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
              <Plus className="w-4 h-4" />
              {reservationForm.reservationStatus === 'reserved' ? 'رزرو موقت غرفه' : 'ثبت قطعی غرفه'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">نقشه غرفه‌ها</h3>
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
                      <p className="text-xs text-slate-400 mt-0.5">{map.stats.filled} / {map.category.boothCount} غرفه</p>
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
            <p className="text-xs text-slate-400 mt-3 text-center">کلیک روی غرفه پر = ویرایش اطلاعات رزرو</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 max-h-[28rem] overflow-y-auto">
            <h3 className="font-semibold text-slate-800 mb-3">لیست رزروها ({filled})</h3>
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
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-500">{category ? boothCode(category, reservation.boothNumber) : `#${reservation.boothNumber}`}</span>
                            <span className="font-semibold mr-2">{reservation.companyName}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${reservation.reservationStatus === 'reserved' ? 'bg-orange-200 text-orange-800' : 'bg-emerald-200 text-emerald-800'}`}>
                              {reservation.reservationStatus === 'reserved' ? 'رزرو موقت' : 'قطعی'}
                            </span>
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
    </div>
  );
});
