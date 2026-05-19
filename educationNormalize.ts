import type { EducationCourse, EducationFeeCurrency, EducationParticipant } from './types';
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
    participants: (c.participants ?? []).map(normalizeEducationParticipant),
  };
}
