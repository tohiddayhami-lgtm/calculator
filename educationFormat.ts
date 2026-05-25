import type { EducationCourse, EducationFeeCurrency } from './types';

export const EDUCATION_CURRENCY_OPTIONS: { value: EducationFeeCurrency; label: string; short: string }[] = [
  { value: 'IRR', label: 'ریال ایران', short: 'ریال' },
  { value: 'OMR', label: 'ریال عمان', short: 'OMR' },
  { value: 'USD', label: 'دلار آمریکا', short: 'USD' },
];

export function currencyLabel(code: string): string {
  return EDUCATION_CURRENCY_OPTIONS.find(c => c.value === code)?.label ?? code;
}

export function currencyShort(code: string): string {
  return EDUCATION_CURRENCY_OPTIONS.find(c => c.value === code)?.short ?? code;
}

export function normalizeLocalizedDigits(raw: string): string {
  return String(raw ?? '')
    .replace(/[۰-۹]/g, ch => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
    .replace(/[٠-٩]/g, ch => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)))
    .replace(/٬/g, ',')
    .replace(/٫/g, '.');
}

export function toPersianDigits(value: unknown): string {
  return String(value ?? '')
    .replace(/[0-9]/g, ch => '۰۱۲۳۴۵۶۷۸۹'[Number(ch)])
    .replace(/,/g, '٬');
}

/** Strip to digits and optional single decimal point. */
export function parseAmountDigits(raw: string): string {
  const s = normalizeLocalizedDigits(raw).replace(/,/g, '').replace(/،/g, '').trim();
  const m = s.match(/^(\d*)(?:\.(\d*))?$/);
  if (!m && s) {
    const digits = s.replace(/[^\d.]/g, '');
    const parts = digits.split('.');
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
    return digits;
  }
  if (!m) return '';
  const intPart = m[1] || '';
  const dec = m[2];
  if (dec !== undefined) return dec.length ? `${intPart}.${dec}` : intPart;
  return intPart;
}

export function parseAmountNumber(raw: string): number | null {
  const d = parseAmountDigits(raw);
  if (!d || d === '.') return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

/** Display with thousand separators (Western digits). */
export function formatAmountDisplay(raw: string): string {
  const d = parseAmountDigits(raw);
  if (!d || d === '.') return '';
  const [intPart, dec] = d.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${intFormatted}.${dec}` : intFormatted;
}

export function formatAmountDisplayFa(raw: string): string {
  return toPersianDigits(formatAmountDisplay(raw));
}

export function feeCurrencyDisplay(course: Pick<EducationCourse, 'courseFeeCurrency' | 'courseFeeCurrencyLabel'>): string {
  const custom = course.courseFeeCurrencyLabel?.trim();
  if (custom) return custom;
  return currencyShort(course.courseFeeCurrency);
}

export function formatAmountWithCurrency(
  amount: string,
  currency: string,
  currencyLabel?: string,
): string {
  const display = formatAmountDisplay(amount);
  if (!display) return '—';
  const unit = currencyLabel?.trim() || currencyShort(currency);
  return `${display} ${unit}`;
}

export function formatAmountWithCurrencyFa(
  amount: string,
  currency: string,
  currencyLabel?: string,
): string {
  const display = formatAmountDisplayFa(amount);
  if (!display) return '—';
  const unit = currencyLabel?.trim() || currencyShort(currency);
  return `${display} ${unit}`;
}
