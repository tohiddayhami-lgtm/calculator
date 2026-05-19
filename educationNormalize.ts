import type {
  EducationCourse,
  EducationFeeCurrency,
  EducationInstructorMediaItem,
  EducationParticipant,
  EducationVipGuest,
} from './types';
import { currencyShort } from './educationFormat';
import { normalizeStoryTypography } from './educationStoryTypography';

function normCurrency(raw: unknown): EducationFeeCurrency {
  if (raw === 'IRR' || raw === 'USD') return raw;
  return 'OMR';
}

export function normalizeEducationParticipant(p: EducationParticipant): EducationParticipant {
  return {
    ...p,
    registrationStatus: p.registrationStatus === 'reserved' ? 'reserved' : 'confirmed',
    amountPaid: p.amountPaid ?? '',
    amountRemaining: p.amountRemaining ?? '',
    paymentNote: p.paymentNote ?? '',
  };
}

function normResumeMedia(raw: unknown): EducationInstructorMediaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x: unknown) => {
      const o = x as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : '';
      let kind: EducationInstructorMediaItem['kind'] =
        o.kind === 'image' || o.kind === 'video' || o.kind === 'file' ? o.kind : 'file';
      const fileName = typeof o.fileName === 'string' ? o.fileName : 'file';
      const mimeType = typeof o.mimeType === 'string' ? o.mimeType : '';
      if (!(o.kind === 'image' || o.kind === 'video' || o.kind === 'file')) {
        const m = mimeType.toLowerCase();
        if (m.startsWith('image/')) kind = 'image';
        else if (m.startsWith('video/')) kind = 'video';
        else kind = 'file';
      }
      const dataUrl = typeof o.dataUrl === 'string' ? o.dataUrl : '';
      const addedAt = typeof o.addedAt === 'number' ? o.addedAt : 0;
      if (!id || !dataUrl) return null;
      return { id, kind, fileName, mimeType, dataUrl, addedAt };
    })
    .filter(Boolean) as EducationInstructorMediaItem[];
}

function normVipGuests(raw: unknown): EducationVipGuest[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x: unknown) => {
      const o = x as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : '';
      const fullName = typeof o.fullName === 'string' ? o.fullName : '';
      const resume = typeof o.resume === 'string' ? o.resume : '';
      if (!id) return null;
      return { id, fullName, resume };
    })
    .filter(Boolean) as EducationVipGuest[];
}

export function normalizeEducationCourse(c: EducationCourse): EducationCourse {
  const opacity =
    typeof c.storyBackgroundOpacity === 'number' && Number.isFinite(c.storyBackgroundOpacity)
      ? Math.min(100, Math.max(0, Math.round(c.storyBackgroundOpacity)))
      : 40;
  return {
    ...c,
    instructorResume: c.instructorResume ?? '',
    instructorPhotoUrl: typeof c.instructorPhotoUrl === 'string' ? c.instructorPhotoUrl : '',
    courseFee: c.courseFee ?? '',
    courseFeeLabel:
      typeof c.courseFeeLabel === 'string' && c.courseFeeLabel.trim()
        ? c.courseFeeLabel.trim()
        : 'شهریه',
    courseFeeCurrency: normCurrency(c.courseFeeCurrency),
    courseFeeCurrencyLabel:
      typeof c.courseFeeCurrencyLabel === 'string'
        ? c.courseFeeCurrencyLabel
        : currencyShort(normCurrency(c.courseFeeCurrency)),
    storyBackgroundUrl: typeof c.storyBackgroundUrl === 'string' ? c.storyBackgroundUrl : '',
    storyBackgroundOpacity: opacity,
    instructorResumeMedia: normResumeMedia(c.instructorResumeMedia),
    storyFootNote: typeof c.storyFootNote === 'string' ? c.storyFootNote : '',
    storyFootNoteAlign:
      c.storyFootNoteAlign === 'center' || c.storyFootNoteAlign === 'left'
        ? c.storyFootNoteAlign
        : 'right',
    storyFootNoteFontSize:
      typeof c.storyFootNoteFontSize === 'number' && Number.isFinite(c.storyFootNoteFontSize)
        ? Math.min(40, Math.max(14, Math.round(c.storyFootNoteFontSize)))
        : 22,
    storyTypography: c.storyTypography
      ? normalizeStoryTypography(c.storyTypography)
      : undefined,
    syllabus: Array.isArray(c.syllabus)
      ? c.syllabus.map(s => ({
          id: typeof s?.id === 'string' ? s.id : '',
          text: typeof s?.text === 'string' ? s.text : '',
        }))
      : [],
    participants: (c.participants ?? []).map(normalizeEducationParticipant),
    vipGuests: normVipGuests(c.vipGuests),
  };
}
