import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Download,
  GraduationCap,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { EducationCourse, EducationParticipant, EducationSyllabusItem } from './types';
import {
  downloadEducationStory,
  EDUCATION_STORY_HEIGHT,
  EDUCATION_STORY_WIDTH,
  renderEducationStoryPng,
} from './educationStoryExport';

export const EDUCATION_STORAGE_KEY = 'exportcalc_education_courses_v1';

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
    location: '',
    startDate: today,
    endDate: today,
    syllabus: [{ id: newId(), text: '' }],
    seatCapacity: 50,
    participants: [],
    createdAt: now,
    updatedAt: now,
  };
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
  const [participantForm, setParticipantForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
  });

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

  const filled = editing?.participants.length ?? 0;
  const cap = editing?.seatCapacity ?? 0;
  const isFull = filled >= cap && cap > 0;

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
      registeredAt: Date.now(),
    };
    upd({ participants: [...editing.participants, p] });
    setParticipantForm({ firstName: '', lastName: '', phone: '', city: '' });
  };

  const handleExportStory = async () => {
    if (!editing) return;
    setExporting(true);
    try {
      const saved = saveCourse(editing);
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
      const blob = await renderEducationStoryPng(editing);
      if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
      setStoryPreviewUrl(URL.createObjectURL(blob));
    } catch {
      alert('پیش‌نمایش در دسترس نیست.');
    } finally {
      setExporting(false);
    }
  };

  const inputCls =
    'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300';
  const labelCls = 'text-xs text-slate-500 font-medium mb-1 block';

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
                    <p className="text-sm text-slate-500 mt-0.5">{c.instructorName || '—'}</p>
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
                        setEditing(JSON.parse(JSON.stringify(c)) as EducationCourse);
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
              <input value={editing.instructorName} onChange={e => upd({ instructorName: e.target.value })} className={inputCls} dir="rtl" />
            </div>
            <div>
              <label className={labelCls}>مکان برگزاری</label>
              <input value={editing.location} onChange={e => upd({ location: e.target.value })} className={inputCls} dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>تاریخ شروع</label>
                <input type="date" value={editing.startDate} onChange={e => upd({ startDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>تاریخ پایان</label>
                <input type="date" value={editing.endDate} onChange={e => upd({ endDate: e.target.value })} className={inputCls} />
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
              ثبت‌نام قطعی (اشغال صندلی)
            </h3>
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
            <button
              type="button"
              onClick={handleAddParticipant}
              disabled={isFull}
              className="w-full flex items-center justify-center gap-2 text-sm bg-teal-600 text-white rounded-lg py-2 hover:bg-teal-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> تأیید و رزرو صندلی
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">نقشه صندلی‌ها</h3>
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
                        ? `${participant.firstName} ${participant.lastName} — ${participant.city}`
                        : `صندلی ${num} — خالی`
                    }
                    onClick={() => {
                      if (!participant) return;
                      if (confirm(`حذف ${participant.firstName} ${participant.lastName} از صندلی ${num}؟`)) {
                        upd({ participants: editing.participants.filter(p => p.id !== participant.id) });
                      }
                    }}
                    className={`aspect-square rounded-md text-[10px] font-bold transition-all ${
                      participant
                        ? 'bg-teal-500 text-white hover:bg-red-500 shadow-sm'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3 text-center">کلیک روی صندلی پر = حذف ثبت‌نام</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 max-h-80 overflow-y-auto">
            <h3 className="font-semibold text-slate-800 mb-3">لیست شرکت‌کنندگان ({filled})</h3>
            {editing.participants.length === 0 ? (
              <p className="text-sm text-slate-400">هنوز کسی ثبت‌نام قطعی نشده.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b">
                    <th className="text-right py-2">صندلی</th>
                    <th className="text-right py-2">نام</th>
                    <th className="text-right py-2">شهر</th>
                    <th className="text-right py-2">تماس</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...editing.participants]
                    .sort((a, b) => a.seatNumber - b.seatNumber)
                    .map(p => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="py-2 font-mono text-teal-700">{p.seatNumber}</td>
                        <td className="py-2">
                          {p.firstName} {p.lastName}
                        </td>
                        <td className="py-2 text-slate-600">{p.city || '—'}</td>
                        <td className="py-2 text-slate-600 font-mono text-xs" dir="ltr">
                          {p.phone || '—'}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => upd({ participants: editing.participants.filter(x => x.id !== p.id) })}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

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
