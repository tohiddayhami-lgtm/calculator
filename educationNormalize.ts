import type {
  EducationCourse,
  EducationFeeCurrency,
  EducationInstructorMediaItem,
  EducationParticipant,
} from './types';
import { currencyShort } from './educationFormat';

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

export function normalizeEducationCourse(c: EducationCourse): EducationCourse {
  const opacity =
    typeof c.storyBackgroundOpacity === 'number' && Number.isFinite(c.storyBackgroundOpacity)
      ? Math.min(100, Math.max(0, Math.round(c.storyBackgroundOpacity)))
      : 40;
  return {
    ...c,
    instructorResume: c.instructorResume ?? '',
    courseFee: c.courseFee ?? '',
    courseFeeCurrency: normCurrency(c.courseFeeCurrency),
    courseFeeCurrencyLabel:
      typeof c.courseFeeCurrencyLabel === 'string'
        ? c.courseFeeCurrencyLabel
        : currencyShort(normCurrency(c.courseFeeCurrency)),
    storyBackgroundUrl: typeof c.storyBackgroundUrl === 'string' ? c.storyBackgroundUrl : '',
    storyBackgroundOpacity: opacity,
    instructorResumeMedia: normResumeMedia(c.instructorResumeMedia),
    storyFootNote: typeof c.storyFootNote === 'string' ? c.storyFootNote : '',
    participants: (c.participants ?? []).map(normalizeEducationParticipant),
  };
}
