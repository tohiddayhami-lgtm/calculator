import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Crown,
  Download,
  FileVideo,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  EducationCourse,
  EducationFeeCurrency,
  EducationInstructorMediaItem,
  EducationParticipant,
  EducationRegistrationStatus,
  EducationVipGuest,
} from './types';
import { normalizeEducationCourse } from './educationNormalize';
import {
  EDUCATION_CURRENCY_OPTIONS,
  currencyShort,
  formatAmountDisplay,
  formatAmountWithCurrency,
  parseAmountDigits,
  parseAmountNumber,
} from './educationFormat';
import {
  downloadEducationStory,
  EDUCATION_STORY_HEIGHT,
  EDUCATION_STORY_WIDTH,
  renderEducationStoryPng,
} from './educationStoryExport';
import {
  loadSavedStoryTypography,
  resolveStoryTypography,
  saveStoryTypographyDefaults,
  STORY_TYPOGRAPHY_FIELDS,
  type EducationStoryTypography,
} from './educationStoryTypography';

export const EDUCATION_STORAGE_KEY = 'exportcalc_education_courses_v1';

const EDUCATION_RESUME_MEDIA_MAX_BYTES = 12 * 1024 * 1024;
const INSTRUCTOR_PHOTO_MAX_BYTES = 4 * 1024 * 1024;

function resumeMediaKind(mime: string): EducationInstructorMediaItem['kind'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function makeBlankEducationCourse(): EducationCourse {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  return {
    id: String(now),
    title: '',
    instructorName: '',
    instructorPhotoUrl: '',
    instructorResume: '',
    instructorResumeMedia: [],
    storyFootNote: '',
    storyFootNoteAlign: 'center',
    storyFootNoteFontSize: 22,
    location: '',
    startDate: today,
    endDate: today,
    courseFee: '',
    courseFeeCurrency: 'OMR',
    courseFeeCurrencyLabel: 'OMR',
    storyBackgroundUrl: '',
    storyBackgroundOpacity: 40,
    syllabus: [{ id: newId(), text: '' }],
    seatCapacity: 50,
    participants: [],
    vipGuests: [],
    createdAt: now,
    updatedAt: now,
  };
}

function updateParticipant(
  participants: EducationParticipant[],
  id: string,
  patch: Partial<EducationParticipant>,
): EducationParticipant[] {
  return participants.map(p => (p.id === id ? { ...p, ...patch } : p));
}

function nextSeatNumber(course: EducationCourse): number | null {
  if (course.participants.length >= course.seatCapacity) return null;
  const used = new Set(course.participants.map(p => p.seatNumber));
  for (let n = 1; n <= course.seatCapacity; n++) {
    if (!used.has(n)) return n;
  }
  return null;
}

type Props = {
  courses: EducationCourse[];
  onSaveCourses: (courses: EducationCourse[]) => void;
};

export function EducationFormsPanel({ courses, onSaveCourses }: Props) {
  const [subView, setSubView] = useState<'list' | 'editor'>('list');
  const [editing, setEditing] = useState<EducationCourse | null>(null);
  const [exporting, setExporting] = useState(false);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [participantForm, setParticipantForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    registrationStatus: 'confirmed' as EducationRegistrationStatus,
    amountPaid: '',
    amountRemaining: '',
    paymentNote: '',
  });
  const [participantEditForm, setParticipantEditForm] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    registrationStatus: EducationRegistrationStatus;
    amountPaid: string;
    amountRemaining: string;
    paymentNote: string;
  } | null>(null);

  const saveCourse = (c: EducationCourse) => {
    const next = { ...c, updatedAt: Date.now() };
    const exists = courses.some(x => x.id === c.id);
    onSaveCourses(exists ? courses.map(x => (x.id === c.id ? next : x)) : [...courses, next]);
    return next;
  };

  const upd = (patch: Partial<EducationCourse>) => {
    if (!editing) return;
    setEditing({ ...editing, ...patch, updatedAt: Date.now() });
  };

  const addInstructorResumeMediaFiles = async (files: File[]) => {
    if (!files.length) return;
    let rejected = false;
    const items: EducationInstructorMediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > EDUCATION_RESUME_MEDIA_MAX_BYTES) {
        rejected = true;
        continue;
      }
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => reject(new Error('read'));
          r.readAsDataURL(file);
        });
        if (!dataUrl) {
          rejected = true;
          continue;
        }
        items.push({
          id: newId(),
          kind: resumeMediaKind(file.type || 'application/octet-stream'),
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataUrl,
          addedAt: Date.now(),
        });
      } catch {
        rejected = true;
      }
    }
    if (rejected) {
      alert('برخی فایل‌ها اضافه نشدند (خطای خواندن یا بیش از ۱۲ مگابایت).');
    }
    if (!items.length) return;
    setEditing(cur => {
      if (!cur) return cur;
      return {
        ...cur,
        instructorResumeMedia: [...(cur.instructorResumeMedia ?? []), ...items],
        updatedAt: Date.now(),
      };
    });
  };

  const removeInstructorResumeMedia = (id: string) => {
    if (!editing) return;
    upd({
      instructorResumeMedia: (editing.instructorResumeMedia ?? []).filter(m => m.id !== id),
    });
  };

  const onInstructorPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = '';
    const file = picked[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('فقط فایل تصویر برای عکس مدرس مجاز است.');
      return;
    }
    if (file.size > INSTRUCTOR_PHOTO_MAX_BYTES) {
      alert('حجم تصویر مدرس حداکثر ۴ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => upd({ instructorPhotoUrl: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  const updateVipGuest = (id: string, patch: Partial<EducationVipGuest>) => {
    if (!editing) return;
    upd({
      vipGuests: (editing.vipGuests ?? []).map(g => (g.id === id ? { ...g, ...patch } : g)),
    });
  };

  const addVipGuest = () => {
    if (!editing) return;
    upd({
      vipGuests: [...(editing.vipGuests ?? []), { id: newId(), fullName: '', resume: '' }],
    });
  };

  const removeVipGuest = (id: string) => {
    if (!editing) return;
    upd({ vipGuests: (editing.vipGuests ?? []).filter(g => g.id !== id) });
  };

  const filled = editing?.participants.length ?? 0;
  const cap = editing?.seatCapacity ?? 0;
  const isFull = filled >= cap && cap > 0;
  const confirmedCount = editing?.participants.filter(p => p.registrationStatus === 'confirmed').length ?? 0;
  const reservedCount = filled - confirmedCount;

  const seatGrid = useMemo(() => {
    if (!editing) return null;
    const cols = cap <= 30 ? 10 : cap <= 60 ? 12 : 15;
    const taken = new Map<number, EducationParticipant>();
    editing.participants.forEach(p => taken.set(p.seatNumber, p));
    const cells: { num: number; participant?: EducationParticipant }[] = [];
    for (let n = 1; n <= cap; n++) {
      cells.push({ num: n, participant: taken.get(n) });
    }
    return { cols, cells };
  }, [editing, cap]);

  const handleAddParticipant = () => {
    if (!editing) return;
    const fn = participantForm.firstName.trim();
    const ln = participantForm.lastName.trim();
    if (!fn || !ln) {
      alert('نام و نام خانوادگی الزامی است.');
      return;
    }
    const seat = nextSeatNumber(editing);
    if (seat == null) {
      alert('ظرفیت صندلی‌ها تکمیل شده است.');
      return;
    }
    const p: EducationParticipant = {
      id: newId(),
      firstName: fn,
      lastName: ln,
      phone: participantForm.phone.trim(),
      city: participantForm.city.trim(),
      seatNumber: seat,
      registrationStatus: participantForm.registrationStatus,
      amountPaid: participantForm.amountPaid.trim(),
      amountRemaining: participantForm.amountRemaining.trim(),
      paymentNote: participantForm.paymentNote.trim(),
      registeredAt: Date.now(),
    };
    upd({ participants: [...editing.participants, p] });
    setParticipantForm({
      firstName: '',
      lastName: '',
      phone: '',
      city: '',
      registrationStatus: participantForm.registrationStatus,
      amountPaid: '',
      amountRemaining: '',
      paymentNote: '',
    });
  };

  const fillHalfPayment = (target: 'form' | string) => {
    if (!editing?.courseFee?.trim()) return;
    const fee = parseAmountNumber(editing.courseFee);
    if (fee === null || fee <= 0) return;
    const half = Math.round((fee / 2) * 100) / 100;
    const rest = Math.round((fee - half) * 100) / 100;
    const paid = parseAmountDigits(String(half));
    const rem = parseAmountDigits(String(rest));
    if (target === 'form') {
      setParticipantForm(f => ({ ...f, amountPaid: paid, amountRemaining: rem }));
      return;
    }
    upd({
      participants: updateParticipant(editing.participants, target, {
        amountPaid: paid,
        amountRemaining: rem,
      }),
    });
  };

  const openParticipantEdit = (p: EducationParticipant) => {
    setEditingParticipantId(p.id);
    setParticipantEditForm({
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      city: p.city,
      registrationStatus: p.registrationStatus,
      amountPaid: p.amountPaid,
      amountRemaining: p.amountRemaining,
      paymentNote: p.paymentNote,
    });
  };
  const closeParticipantEdit = () => {
    setEditingParticipantId(null);
    setParticipantEditForm(null);
  };
  const saveParticipantEdit = () => {
    if (!editing || !editingParticipantId || !participantEditForm) return;
    const fn = participantEditForm.firstName.trim();
    const ln = participantEditForm.lastName.trim();
    if (!fn || !ln) {
      alert('نام و نام خانوادگی الزامی است.');
      return;
    }
    upd({
      participants: updateParticipant(editing.participants, editingParticipantId, {
        firstName: fn,
        lastName: ln,
        phone: participantEditForm.phone.trim(),
        city: participantEditForm.city.trim(),
        registrationStatus: participantEditForm.registrationStatus,
        amountPaid: participantEditForm.amountPaid,
        amountRemaining: participantEditForm.amountRemaining,
        paymentNote: participantEditForm.paymentNote.trim(),
      }),
    });
    closeParticipantEdit();
  };
  const onAmountInput = (raw: string) => parseAmountDigits(raw.replace(/,/g, '').replace(/،/g, ''));

  const handleExportStory = async () => {
    if (!editing) return;
    setExporting(true);
    try {
      const saved = saveCourse(normalizeEducationCourse(editing));
      await downloadEducationStory(saved);
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
      const blob = await renderEducationStoryPng(normalizeEducationCourse(editing));
      if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
      setStoryPreviewUrl(URL.createObjectURL(blob));
    } catch {
      alert('پیش‌نمایش در دسترس نیست.');
    } finally {
      setExporting(false);
    }
  };

  const inputCls =
    'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 font-[Vazirmatn,Tahoma,sans-serif]';
  const labelCls = 'text-xs text-slate-500 font-medium mb-1 block';

  const editingParticipant = editing?.participants.find(p => p.id === editingParticipantId);

  const courseTypo = editing ? resolveStoryTypography(editing) : loadSavedStoryTypography();

  const patchStoryTypo = (patch: Partial<EducationStoryTypography>) => {
    if (!editing) return;
    upd({
      storyTypography: {
        ...(editing.storyTypography ?? {}),
        ...patch,
      },
    });
  };

  const saveTypoAsDefault = () => {
    if (!editing) return;
    const resolved = resolveStoryTypography(editing);
    saveStoryTypographyDefaults(resolved);
    alert('تنظیمات فونت به‌عنوان پیش‌فرض ذخیره شد و برای دوره‌های بعدی اعمال می‌شود.');
  };

  const resetTypoToDefault = () => {
    if (!confirm('تنظیمات فونت این دوره به پیش‌فرض ذخیره‌شده بازگردد؟')) return;
    upd({ storyTypography: undefined, storyFootNoteFontSize: undefined });
  };

  if (subView === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              آموزش — دوره‌ها و ثبت‌نام
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">تعریف دوره، ظرفیت صندلی، ثبت شرکت‌کننده و خروجی استوری اینستاگرام</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(makeBlankEducationCourse());
              setSubView('editor');
            }}
            className="flex items-center gap-2 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg px-4 py-2 font-medium"
          >
            <Plus className="w-4 h-4" /> دوره جدید
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">هنوز دوره‌ای تعریف نشده است.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {courses.map(c => {
              const pct = c.seatCapacity ? Math.round((c.participants.length / c.seatCapacity) * 100) : 0;
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{c.title || 'بدون عنوان'}</div>
                    <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      {c.instructorPhotoUrl ? (
                        <img
                          src={c.instructorPhotoUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : null}
                      <span>{c.instructorName || '—'}</span>
                    </p>
                    {(c.vipGuests ?? []).some(g => g.fullName?.trim()) ? (
                      <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 shrink-0" />
                        VIP: {(c.vipGuests ?? []).filter(g => g.fullName?.trim()).length} نفر
                      </p>
                    ) : null}
                    {c.courseFee?.trim() ? (
                      <p className="text-xs text-amber-700 mt-1">
                        هزینه: {formatAmountWithCurrency(c.courseFee, c.courseFeeCurrency || 'OMR', c.courseFeeCurrencyLabel)}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
                      <span>{c.startDate}</span>
                      <span>·</span>
                      <span className={pct >= 100 ? 'text-red-600 font-medium' : ''}>
                        {c.participants.length} / {c.seatCapacity} صندلی
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(normalizeEducationCourse(JSON.parse(JSON.stringify(c)) as EducationCourse));
                        setSubView('editor');
                      }}
                      className="text-sm text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50"
                    >
                      مدیریت
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('این دوره حذف شود؟')) onSaveCourses(courses.filter(x => x.id !== c.id));
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3 flex-wrap sticky top-0 z-10">
        <button
          type="button"
          onClick={() => {
            setSubView('list');
            setEditing(null);
            if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
            setStoryPreviewUrl(null);
          }}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> بازگشت
        </button>
        <span className="font-semibold text-slate-800 truncate flex-1 min-w-[120px]">{editing.title || 'دوره جدید'}</span>
        <span className={`text-xs px-2 py-1 rounded-full border ${isFull ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>
          {filled} / {cap} صندلی
        </span>
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
          قطعی {confirmedCount}
        </span>
        <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded-full">
          رزرو {reservedCount}
        </span>
        <button
          type="button"
          onClick={openStoryPreview}
          disabled={exporting}
          className="flex items-center gap-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4" /> پیش‌نمایش استوری
        </button>
        <button
          type="button"
          onClick={handleExportStory}
          disabled={exporting}
          className="flex items-center gap-1 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> {exporting ? '…' : 'دانلود استوری (۱۰۸۰×۱۹۲۰)'}
        </button>
        <button
          type="button"
          onClick={() => {
            saveCourse(editing);
            setSubView('list');
            setEditing(null);
          }}
          className="flex items-center gap-1 text-sm bg-teal-600 text-white rounded-lg px-3 py-1.5"
        >
          <Save className="w-4 h-4" /> ذخیره
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-800">اطلاعات دوره</h3>
            <div>
              <label className={labelCls}>نام دوره</label>
              <input value={editing.title} onChange={e => upd({ title: e.target.value })} className={inputCls} dir="rtl" />
            </div>
            <div>
              <label className={labelCls}>نام استاد</label>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 min-w-0 w-full">
                  <input
                    value={editing.instructorName}
                    onChange={e => upd({ instructorName: e.target.value })}
                    className={inputCls}
                    dir="rtl"
                  />
                </div>
                <div className="shrink-0 flex flex-col items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-500 font-medium">تصویر مدرس</span>
                  {editing.instructorPhotoUrl ? (
                    <div className="relative">
                      <img
                        src={editing.instructorPhotoUrl}
                        alt=""
                        className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => upd({ instructorPhotoUrl: '' })}
                        className="absolute -top-1 -left-1 bg-slate-800 text-white rounded-full p-1 hover:bg-red-600"
                        title="حذف عکس"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 text-center px-1">
                      بدون عکس
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="text-[11px] w-full max-w-[160px]"
                    onChange={onInstructorPhotoChange}
                  />
                  <p className="text-[10px] text-slate-400 text-center max-w-[160px]">حداکثر ۴ مگابایت</p>
                </div>
              </div>
            </div>
            <div>
              <label className={labelCls}>رزومه استاد (در استوری)</label>
              <textarea
                value={editing.instructorResume}
                onChange={e => upd({ instructorResume: e.target.value })}
                rows={4}
                className={inputCls}
                dir="rtl"
                placeholder="سوابق و تخصص استاد..."
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/70">
              <label className={labelCls + ' mb-0'}>پیوست رزومه استاد / دبیر</label>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                عکس، فیلم یا فایل برای همین دوره و استاد ذخیره می‌شود. برای جلوگیری از پر شدن حافظه مرورگر، هر فایل حداکثر ۱۲ مگابایت.
              </p>
              <input
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.zip,.rar"
                className="text-sm w-full"
                onChange={async e => {
                  const input = e.target;
                  const picked = input.files?.length ? Array.from(input.files) : [];
                  input.value = '';
                  await addInstructorResumeMediaFiles(picked);
                }}
              />
              <p className="text-[10px] text-slate-400">می‌توانید چند فایل را با هم انتخاب کنید (Ctrl یا Shift).</p>
              {(editing.instructorResumeMedia ?? []).length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {(editing.instructorResumeMedia ?? []).map(m => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 text-xs border border-slate-200 rounded-lg p-2 bg-white"
                    >
                      {m.kind === 'image' ? (
                        <img src={m.dataUrl} alt="" className="w-12 h-12 object-cover rounded shrink-0" />
                      ) : m.kind === 'video' ? (
                        <span className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center shrink-0">
                          <FileVideo className="w-6 h-6 text-white" />
                        </span>
                      ) : (
                        <span className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-slate-600" />
                        </span>
                      )}
                      <span className="flex-1 min-w-0 truncate" title={m.fileName}>
                        {m.fileName}
                      </span>
                      <a href={m.dataUrl} download={m.fileName} className="text-teal-600 shrink-0 text-[11px]">
                        باز / دانلود
                      </a>
                      <button
                        type="button"
                        onClick={() => removeInstructorResumeMedia(m.id)}
                        className="text-red-400 p-1 shrink-0"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">هنوز پیوستی اضافه نشده.</p>
              )}
            </div>
            <div className="border border-amber-200 rounded-xl p-4 space-y-3 bg-amber-50/50">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className={`${labelCls} mb-0 flex items-center gap-1.5`}>
                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                  مهمانان VIP (اختیاری)
                </label>
                <button
                  type="button"
                  onClick={addVipGuest}
                  className="text-xs text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50 font-medium"
                >
                  + افزودن مهمان
                </button>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                صندلی اشغال نمی‌کنند. نام و در صورت تمایل رزومهٔ کوتاه در استوری نمایش داده می‌شود.
              </p>
              {(editing.vipGuests ?? []).length === 0 ? (
                <p className="text-xs text-slate-400">مهمان VIP ثبت نشده.</p>
              ) : (
                <div className="space-y-3">
                  {(editing.vipGuests ?? []).map(g => (
                    <div key={g.id} className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                      <input
                        placeholder="نام و نام خانوادگی"
                        value={g.fullName}
                        onChange={e => updateVipGuest(g.id, { fullName: e.target.value })}
                        className={inputCls}
                        dir="rtl"
                      />
                      <textarea
                        placeholder="رزومه کوتاه (اختیاری)"
                        value={g.resume}
                        onChange={e => updateVipGuest(g.id, { resume: e.target.value })}
                        rows={2}
                        className={inputCls}
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() => removeVipGuest(g.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        حذف این مهمان
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>شهریه دوره</label>
                <input
                  value={formatAmountDisplay(editing.courseFee)}
                  onChange={e => upd({ courseFee: onAmountInput(e.target.value) })}
                  className={inputCls}
                  dir="ltr"
                  placeholder="1,500,000"
                />
              </div>
              <div>
                <label className={labelCls}>ارز</label>
                <select
                  value={editing.courseFeeCurrency}
                  onChange={e => {
                    const code = e.target.value as EducationFeeCurrency;
                    upd({
                      courseFeeCurrency: code,
                      courseFeeCurrencyLabel: currencyShort(code),
                    });
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
              <input
                value={editing.courseFeeCurrencyLabel ?? currencyShort(editing.courseFeeCurrency)}
                onChange={e => upd({ courseFeeCurrencyLabel: e.target.value })}
                className={inputCls}
                dir="rtl"
                placeholder="مثلاً ریال ایران، OMR، USD"
              />
            </div>
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/80">
              <label className={labelCls + ' mb-0'}>پس‌زمینه استوری (عکس + شفافیت)</label>
              {editing.storyBackgroundUrl ? (
                <div className="relative rounded-lg overflow-hidden h-32">
                  <img src={editing.storyBackgroundUrl} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => upd({ storyBackgroundUrl: '' })} className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
              <input type="file" accept="image/*" className="text-sm w-full" onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => upd({ storyBackgroundUrl: String(reader.result || '') });
                  reader.readAsDataURL(file);
                }} />
              <div>
                <span className="text-xs text-slate-500">شفافیت عکس: {editing.storyBackgroundOpacity ?? 40}%</span>
                <input type="range" min={0} max={100} value={editing.storyBackgroundOpacity ?? 40} onChange={e => upd({ storyBackgroundOpacity: Number(e.target.value) })} className="w-full accent-teal-600" />
                <p className="text-[10px] text-slate-400 mt-1">۰ = فقط گرادیان · ۱۰۰ = عکس پررنگ‌تر</p>
              </div>
            </div>
            <div className="border border-indigo-200 rounded-xl p-4 space-y-3 bg-indigo-50/40">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className={labelCls + ' mb-0'}>تنظیمات فونت خروجی استوری</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={saveTypoAsDefault}
                    className="text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700"
                  >
                    ذخیره پیش‌فرض
                  </button>
                  <button
                    type="button"
                    onClick={resetTypoToDefault}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50"
                  >
                    بازنشانی
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-600">
                «ذخیره پیش‌فرض» برای همه دوره‌ها ذخیره می‌شود. اسلایدرها روی همین دوره اعمال می‌شود؛ با ذخیره دوره ماندگار می‌ماند.
              </p>
              <div>
                <label className={labelCls}>حداکثر خط عنوان دوره</label>
                <select
                  value={courseTypo.titleMaxLines}
                  onChange={e => patchStoryTypo({ titleMaxLines: Number(e.target.value) })}
                  className={inputCls}
                >
                  <option value={1}>۱ خط</option>
                  <option value={2}>۲ خط</option>
                  <option value={3}>۳ خط</option>
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {STORY_TYPOGRAPHY_FIELDS.filter(f => f.key !== 'titleMaxLines').map(f => (
                  <div key={f.key}>
                    <span className="text-xs text-slate-600">
                      {f.label}: {courseTypo[f.key]}px
                    </span>
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      value={courseTypo[f.key]}
                      onChange={e =>
                        patchStoryTypo({ [f.key]: Number(e.target.value) } as Partial<EducationStoryTypography>)
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>نوت استوری (اختیاری)</label>
              <textarea
                value={editing.storyFootNote ?? ''}
                onChange={e => upd({ storyFootNote: e.target.value })}
                rows={3}
                className={inputCls}
                dir="rtl"
                placeholder="مثلاً: برای ثبت‌نام کلمه آموزش را دایرکت کنید"
              />
              <p className="text-[10px] text-slate-400 mt-1 mb-2">
                زیر درصد اشغال و نوار پیشرفت در خروجی استوری نمایش داده می‌شود.
              </p>
              <div className="flex gap-2 mb-2">
                {(
                  [
                    { id: 'right' as const, label: 'راست‌چین' },
                    { id: 'center' as const, label: 'وسط‌چین' },
                    { id: 'left' as const, label: 'چپ‌چین' },
                  ] as const
                ).map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => upd({ storyFootNoteAlign: a.id })}
                    className={`flex-1 text-xs py-2 rounded-lg border font-medium ${
                      (editing.storyFootNoteAlign ?? 'center') === a.id
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">اندازه فونت نوت در بخش «تنظیمات فونت خروجی استوری» تنظیم می‌شود.</p>
            </div>
            <div>
              <label className={labelCls}>مکان برگزاری</label>
              <input value={editing.location} onChange={e => upd({ location: e.target.value })} className={inputCls} dir="rtl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>تاریخ دوره (از)</label>
                <input
                  type="text"
                  value={editing.startDate}
                  onChange={e => upd({ startDate: e.target.value })}
                  className={inputCls}
                  dir="rtl"
                  placeholder="مثلاً ۱۹ اردیبهشت ۱۴۰۵ یا 2026-05-19"
                />
              </div>
              <div>
                <label className={labelCls}>تا (اختیاری)</label>
                <input
                  type="text"
                  value={editing.endDate}
                  onChange={e => upd({ endDate: e.target.value })}
                  className={inputCls}
                  dir="rtl"
                  placeholder="خالی = همان تاریخ بالا"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>ظرفیت صندلی</label>
              <input
                type="number"
                min={1}
                max={500}
                value={editing.seatCapacity}
                onChange={e => {
                  const n = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1));
                  let participants = editing.participants;
                  if (participants.length > n) {
                    if (!confirm(`تعداد ثبت‌نام‌ها (${participants.length}) بیش از ظرفیت جدید است. آخرین نفرات حذف شوند؟`)) return;
                    participants = participants.slice(0, n);
                  }
                  upd({ seatCapacity: n, participants });
                }}
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls + ' mb-0'}>سرفصل‌ها</label>
                <button
                  type="button"
                  onClick={() =>
                    upd({ syllabus: [...editing.syllabus, { id: newId(), text: '' }] })
                  }
                  className="text-xs text-teal-600"
                >
                  + سرفصل
                </button>
              </div>
              <div className="space-y-2">
                {editing.syllabus.map((s, i) => (
                  <div key={s.id} className="flex gap-2">
                    <input
                      value={s.text}
                      onChange={e => {
                        const syllabus = editing.syllabus.map((x, j) =>
                          j === i ? { ...x, text: e.target.value } : x,
                        );
                        upd({ syllabus });
                      }}
                      className={inputCls}
                      dir="rtl"
                      placeholder={`سرفصل ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => upd({ syllabus: editing.syllabus.filter(x => x.id !== s.id) })}
                      className="text-red-400 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-teal-600" />
              ثبت شرکت‌کننده
            </h3>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setParticipantForm(f => ({ ...f, registrationStatus: 'confirmed' }))}
                className={`flex-1 text-sm py-2 rounded-lg border font-medium ${
                  participantForm.registrationStatus === 'confirmed'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                قطعی (سبز)
              </button>
              <button
                type="button"
                onClick={() => setParticipantForm(f => ({ ...f, registrationStatus: 'reserved' }))}
                className={`flex-1 text-sm py-2 rounded-lg border font-medium ${
                  participantForm.registrationStatus === 'reserved'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                رزرو موقت (نارنجی)
              </button>
            </div>
            {isFull && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                ظرفیت تکمیل شده — صندلی خالی وجود ندارد.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                placeholder="نام"
                value={participantForm.firstName}
                onChange={e => setParticipantForm(f => ({ ...f, firstName: e.target.value }))}
                className={inputCls}
                dir="rtl"
                disabled={isFull}
              />
              <input
                placeholder="نام خانوادگی"
                value={participantForm.lastName}
                onChange={e => setParticipantForm(f => ({ ...f, lastName: e.target.value }))}
                className={inputCls}
                dir="rtl"
                disabled={isFull}
              />
              <input
                placeholder="شماره تماس"
                value={participantForm.phone}
                onChange={e => setParticipantForm(f => ({ ...f, phone: e.target.value }))}
                className={inputCls}
                dir="ltr"
                disabled={isFull}
              />
              <input
                placeholder="شهر"
                value={participantForm.city}
                onChange={e => setParticipantForm(f => ({ ...f, city: e.target.value }))}
                className={inputCls}
                dir="rtl"
                disabled={isFull}
              />
            </div>
            <p className="text-xs text-slate-500 mb-2 font-medium">پرداخت (پیش‌پرداخت / مانده)</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input placeholder="مبلغ پرداخت‌شده" value={formatAmountDisplay(participantForm.amountPaid)} onChange={e => setParticipantForm(f => ({ ...f, amountPaid: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" disabled={isFull} />
              <input placeholder="مانده حساب" value={formatAmountDisplay(participantForm.amountRemaining)} onChange={e => setParticipantForm(f => ({ ...f, amountRemaining: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" disabled={isFull} />
            </div>
            {editing.courseFee?.trim() ? (
              <button type="button" onClick={() => fillHalfPayment('form')} disabled={isFull} className="text-xs text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 mb-2 hover:bg-teal-50 w-full">
                نصف هزینه دوره: پرداخت‌شده / مانده (خودکار)
              </button>
            ) : null}
            <input placeholder="یادداشت پرداخت" value={participantForm.paymentNote} onChange={e => setParticipantForm(f => ({ ...f, paymentNote: e.target.value }))} className={inputCls + ' mb-3'} dir="rtl" disabled={isFull} />
            <button
              type="button"
              onClick={handleAddParticipant}
              disabled={isFull}
              className={`w-full flex items-center justify-center gap-2 text-sm text-white rounded-lg py-2 disabled:opacity-50 ${
                participantForm.registrationStatus === 'reserved' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              {participantForm.registrationStatus === 'reserved' ? 'رزرو موقت صندلی' : 'ثبت‌نام قطعی صندلی'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">نقشه صندلی‌ها</h3>
            <div className="flex gap-3 text-xs mb-3 justify-center">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> قطعی</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> رزرو موقت</span>
            </div>
            {seatGrid && (
              <div
                className="grid gap-1.5 justify-center"
                style={{ gridTemplateColumns: `repeat(${seatGrid.cols}, minmax(0, 1fr))` }}
              >
                {seatGrid.cells.map(({ num, participant }) => (
                  <button
                    key={num}
                    type="button"
                    title={
                      participant
                        ? `${participant.firstName} ${participant.lastName} — ${participant.city}${participant.amountPaid ? ` — پرداخت: ${participant.amountPaid}` : ''}`
                        : `صندلی ${num} — خالی`
                    }
                    onClick={() => { if (participant) openParticipantEdit(participant); }}
                    className={`min-h-[56px] rounded-md text-[9px] font-bold transition-all flex flex-col items-center justify-center p-0.5 leading-tight ${
                      participant
                        ? participant.registrationStatus === 'reserved'
                          ? 'bg-orange-500 text-white hover:bg-red-500 shadow-sm'
                          : 'bg-emerald-500 text-white hover:bg-red-500 shadow-sm'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 aspect-square'
                    }`}
                  >
                    <span className="opacity-80">{num}</span>
                    {participant ? (
                      <span className="font-normal text-[7px] w-full text-center px-0.5 break-words line-clamp-3 leading-[1.1] text-white">
                        {participant.firstName} {participant.lastName}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3 text-center">کلیک روی صندلی پر = ویرایش اطلاعات</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 max-h-[28rem] overflow-y-auto">
            <h3 className="font-semibold text-slate-800 mb-3">لیست شرکت‌کنندگان ({filled})</h3>
            {editing.participants.length === 0 ? (
              <p className="text-sm text-slate-400">هنوز کسی ثبت نشده.</p>
            ) : (
              <div className="space-y-3">
                {[...editing.participants]
                  .sort((a, b) => a.seatNumber - b.seatNumber)
                  .map(p => (
                    <div
                      key={p.id}
                      className={`border rounded-lg p-3 text-sm ${
                        p.registrationStatus === 'reserved'
                          ? 'border-orange-200 bg-orange-50/50'
                          : 'border-emerald-200 bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-500">#{p.seatNumber}</span>
                          <span className="font-semibold mr-2">
                            {p.firstName} {p.lastName}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              p.registrationStatus === 'reserved'
                                ? 'bg-orange-200 text-orange-800'
                                : 'bg-emerald-200 text-emerald-800'
                            }`}
                          >
                            {p.registrationStatus === 'reserved' ? 'رزرو موقت' : 'قطعی'}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => openParticipantEdit(p)} className="text-teal-600 p-1 hover:bg-teal-50 rounded" title="ویرایش"><Pencil className="w-4 h-4" /></button>
                          <button type="button" onClick={() => { if (confirm(`حذف ${p.firstName} ${p.lastName}؟`)) { upd({ participants: editing.participants.filter(x => x.id !== p.id) }); if (editingParticipantId === p.id) closeParticipantEdit(); } }} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2">
                        <span>{p.city || '—'}</span>
                        <span dir="ltr" className="text-left">{p.phone || '—'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          value={formatAmountDisplay(p.amountPaid)}
                          onChange={e =>
                            upd({
                              participants: updateParticipant(editing.participants, p.id, {
                                amountPaid: onAmountInput(e.target.value),
                              }),
                            })
                          }
                          className="border rounded px-2 py-1 text-xs"
                          dir="ltr"
                          placeholder="پرداخت‌شده"
                        />
                        <input
                          value={formatAmountDisplay(p.amountRemaining)}
                          onChange={e =>
                            upd({
                              participants: updateParticipant(editing.participants, p.id, {
                                amountRemaining: onAmountInput(e.target.value),
                              }),
                            })
                          }
                          className="border rounded px-2 py-1 text-xs"
                          dir="ltr"
                          placeholder="مانده"
                        />
                      </div>
                      {editing.courseFee?.trim() ? (
                        <button type="button" onClick={() => fillHalfPayment(p.id)} className="text-xs text-teal-700 border border-teal-200 rounded px-2 py-1 mb-2 hover:bg-teal-50 w-full">نصف شهریه (خودکار)</button>
                      ) : null}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            upd({
                              participants: updateParticipant(editing.participants, p.id, {
                                registrationStatus: 'confirmed',
                              }),
                            })
                          }
                          className={`text-xs px-2 py-1 rounded border ${
                            p.registrationStatus === 'confirmed'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'border-slate-200'
                          }`}
                        >
                          قطعی
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            upd({
                              participants: updateParticipant(editing.participants, p.id, {
                                registrationStatus: 'reserved',
                              }),
                            })
                          }
                          className={`text-xs px-2 py-1 rounded border ${
                            p.registrationStatus === 'reserved'
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'border-slate-200'
                          }`}
                        >
                          رزرو
                        </button>
                        <input
                          value={p.paymentNote}
                          onChange={e =>
                            upd({
                              participants: updateParticipant(editing.participants, p.id, {
                                paymentNote: e.target.value,
                              }),
                            })
                          }
                          className="flex-1 min-w-[120px] border rounded px-2 py-1 text-xs"
                          dir="rtl"
                          placeholder="یادداشت"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          
          {editingParticipant && participantEditForm ? (
            <div className="bg-white rounded-xl border-2 border-teal-300 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">ویرایش شرکت‌کننده (صندلی #{editingParticipant.seatNumber})</h3>
                <button type="button" onClick={closeParticipantEdit} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input placeholder="نام" value={participantEditForm.firstName} onChange={e => setParticipantEditForm(f => f && ({ ...f, firstName: e.target.value }))} className={inputCls} dir="rtl" />
                <input placeholder="نام خانوادگی (کامل)" value={participantEditForm.lastName} onChange={e => setParticipantEditForm(f => f && ({ ...f, lastName: e.target.value }))} className={inputCls} dir="rtl" />
                <input placeholder="شماره تماس" value={participantEditForm.phone} onChange={e => setParticipantEditForm(f => f && ({ ...f, phone: e.target.value }))} className={inputCls} dir="ltr" />
                <input placeholder="شهر" value={participantEditForm.city} onChange={e => setParticipantEditForm(f => f && ({ ...f, city: e.target.value }))} className={inputCls} dir="rtl" />
              </div>
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => setParticipantEditForm(f => f && ({ ...f, registrationStatus: 'confirmed' }))} className={`flex-1 text-sm py-2 rounded-lg border ${participantEditForm.registrationStatus === 'confirmed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200'}`}>قطعی</button>
                <button type="button" onClick={() => setParticipantEditForm(f => f && ({ ...f, registrationStatus: 'reserved' }))} className={`flex-1 text-sm py-2 rounded-lg border ${participantEditForm.registrationStatus === 'reserved' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-slate-200'}`}>رزرو موقت</button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input placeholder="پرداخت‌شده" value={formatAmountDisplay(participantEditForm.amountPaid)} onChange={e => setParticipantEditForm(f => f && ({ ...f, amountPaid: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" />
                <input placeholder="مانده" value={formatAmountDisplay(participantEditForm.amountRemaining)} onChange={e => setParticipantEditForm(f => f && ({ ...f, amountRemaining: onAmountInput(e.target.value) }))} className={inputCls} dir="ltr" />
              </div>
              {editing.courseFee?.trim() ? (
                <button type="button" onClick={() => { if (!editingParticipantId) return; fillHalfPayment(editingParticipantId); const fee = parseAmountNumber(editing.courseFee); if (fee === null) return; const half = Math.round((fee/2)*100)/100; const rest = Math.round((fee-half)*100)/100; setParticipantEditForm(f => f ? { ...f, amountPaid: parseAmountDigits(String(half)), amountRemaining: parseAmountDigits(String(rest)) } : f); }} className="text-xs text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 mb-3 hover:bg-teal-50 w-full">نصف شهریه (خودکار)</button>
              ) : null}
              <input placeholder="یادداشت پرداخت" value={participantEditForm.paymentNote} onChange={e => setParticipantEditForm(f => f && ({ ...f, paymentNote: e.target.value }))} className={inputCls + ' mb-3'} dir="rtl" />
              <div className="flex gap-2">
                <button type="button" onClick={saveParticipantEdit} className="flex-1 bg-teal-600 text-white text-sm rounded-lg py-2">ذخیره تغییرات</button>
                <button type="button" onClick={() => { if (confirm(`حذف ${editingParticipant.firstName} ${editingParticipant.lastName}؟`)) { upd({ participants: editing.participants.filter(x => x.id !== editingParticipantId) }); closeParticipantEdit(); } }} className="text-sm text-red-600 border border-red-200 rounded-lg px-4 py-2">حذف</button>
              </div>
            </div>
          ) : null}

{storyPreviewUrl && (
            <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center">
              <p className="text-white text-xs mb-2">پیش‌نمایش استوری ({EDUCATION_STORY_WIDTH}×{EDUCATION_STORY_HEIGHT})</p>
              <img
                src={storyPreviewUrl}
                alt="Story preview"
                className="rounded-lg shadow-2xl max-h-[420px] w-auto"
                style={{ aspectRatio: '9/16' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
