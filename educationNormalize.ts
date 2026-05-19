import type { EducationCourse, EducationParticipant } from './types';

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
  return {
    ...c,
    instructorResume: c.instructorResume ?? '',
    courseFee: c.courseFee ?? '',
    courseFeeCurrency: c.courseFeeCurrency ?? 'OMR',
    participants: (c.participants ?? []).map(normalizeEducationParticipant),
  };
}
