import type { EducationCourse, EducationStoryTypography } from './types';

export type { EducationStoryTypography };

export const EDUCATION_STORY_TYPOGRAPHY_KEY = 'exportcalc_education_story_typography_v1';

export const DEFAULT_STORY_TYPOGRAPHY: EducationStoryTypography = {
  badge: 28,
  title: 44,
  titleMaxLines: 3,
  instructor: 30,
  fee: 32,
  meta: 26,
  sectionHeading: 26,
  body: 22,
  vipHeading: 24,
  vipName: 22,
  vipBody: 20,
  syllabusHeading: 26,
  syllabusItem: 22,
  statsMain: 56,
  statsSub: 28,
  statsDetail: 24,
  footNote: 22,
  legend: 22,
};

export const STORY_TYPOGRAPHY_FIELDS: {
  key: keyof EducationStoryTypography;
  label: string;
  min: number;
  max: number;
  step?: number;
}[] = [
  { key: 'badge', label: 'برچسب «دوره آموزشی»', min: 18, max: 40 },
  { key: 'title', label: 'عنوان دوره', min: 28, max: 56 },
  { key: 'instructor', label: 'نام استاد', min: 20, max: 40 },
  { key: 'fee', label: 'شهریه', min: 22, max: 44 },
  { key: 'meta', label: 'تاریخ و مکان', min: 18, max: 36 },
  { key: 'sectionHeading', label: 'عنوان بخش‌ها (رزومه و …)', min: 18, max: 36 },
  { key: 'body', label: 'متن رزومه استاد', min: 16, max: 32 },
  { key: 'vipHeading', label: 'عنوان VIP', min: 18, max: 36 },
  { key: 'vipName', label: 'نام مهمان VIP', min: 16, max: 32 },
  { key: 'vipBody', label: 'رزومه مهمان VIP', min: 14, max: 28 },
  { key: 'syllabusHeading', label: 'عنوان سرفصل‌ها', min: 18, max: 36 },
  { key: 'syllabusItem', label: 'آیتم سرفصل', min: 16, max: 30 },
  { key: 'statsMain', label: 'آمار اصلی (۱/۵۰)', min: 36, max: 72 },
  { key: 'statsSub', label: 'وضعیت ظرفیت', min: 20, max: 40 },
  { key: 'statsDetail', label: 'قطعی / رزرو', min: 16, max: 32 },
  { key: 'footNote', label: 'نوت استوری', min: 14, max: 40 },
  { key: 'legend', label: 'راهنمای رنگ صندلی', min: 14, max: 32 },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeStoryTypography(raw: unknown): EducationStoryTypography {
  const d = DEFAULT_STORY_TYPOGRAPHY;
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = (k: keyof EducationStoryTypography, min: number, max: number) => {
    const v = o[k];
    return typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : d[k];
  };
  const field = STORY_TYPOGRAPHY_FIELDS.find(f => f.key === 'titleMaxLines');
  const titleMaxLines = clamp(
    typeof o.titleMaxLines === 'number' ? o.titleMaxLines : d.titleMaxLines,
    1,
    3,
  );
  return {
    badge: num('badge', 18, 40),
    title: num('title', 28, 56),
    titleMaxLines,
    instructor: num('instructor', 20, 40),
    fee: num('fee', 22, 44),
    meta: num('meta', 18, 36),
    sectionHeading: num('sectionHeading', 18, 36),
    body: num('body', 16, 32),
    vipHeading: num('vipHeading', 18, 36),
    vipName: num('vipName', 16, 32),
    vipBody: num('vipBody', 14, 28),
    syllabusHeading: num('syllabusHeading', 18, 36),
    syllabusItem: num('syllabusItem', 16, 30),
    statsMain: num('statsMain', 36, 72),
    statsSub: num('statsSub', 20, 40),
    statsDetail: num('statsDetail', 16, 32),
    footNote: num('footNote', 14, 40),
    legend: num('legend', 14, 32),
  };
}

export function loadSavedStoryTypography(): EducationStoryTypography {
  try {
    const raw = localStorage.getItem(EDUCATION_STORY_TYPOGRAPHY_KEY);
    if (!raw) return { ...DEFAULT_STORY_TYPOGRAPHY };
    return normalizeStoryTypography(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_STORY_TYPOGRAPHY };
  }
}

export function saveStoryTypographyDefaults(settings: EducationStoryTypography): void {
  localStorage.setItem(EDUCATION_STORY_TYPOGRAPHY_KEY, JSON.stringify(normalizeStoryTypography(settings)));
}

/** Global saved defaults + per-course overrides + legacy footNote font on course */
export function resolveStoryTypography(course: EducationCourse): EducationStoryTypography {
  const base = loadSavedStoryTypography();
  const merged = normalizeStoryTypography({
    ...base,
    ...(course.storyTypography ?? {}),
  });
  if (
    typeof course.storyFootNoteFontSize === 'number' &&
    Number.isFinite(course.storyFootNoteFontSize)
  ) {
    merged.footNote = clamp(course.storyFootNoteFontSize, 14, 40);
  }
  return merged;
}

export function storyLineHeight(fontSize: number, ratio = 1.28): number {
  return Math.max(fontSize + 4, Math.round(fontSize * ratio));
}
