import type { ProductOrigin } from './types';

const flagUrl = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

const countries = [
  ['AF', 'Afghanistan'],
  ['AL', 'Albania'],
  ['DZ', 'Algeria'],
  ['AD', 'Andorra'],
  ['AO', 'Angola'],
  ['AR', 'Argentina'],
  ['AM', 'Armenia'],
  ['AU', 'Australia'],
  ['AT', 'Austria'],
  ['AZ', 'Azerbaijan'],
  ['BH', 'Bahrain'],
  ['BD', 'Bangladesh'],
  ['BY', 'Belarus'],
  ['BE', 'Belgium'],
  ['BR', 'Brazil'],
  ['BG', 'Bulgaria'],
  ['KH', 'Cambodia'],
  ['CA', 'Canada'],
  ['CL', 'Chile'],
  ['CN', 'China'],
  ['CO', 'Colombia'],
  ['HR', 'Croatia'],
  ['CY', 'Cyprus'],
  ['CZ', 'Czechia'],
  ['DK', 'Denmark'],
  ['EG', 'Egypt'],
  ['EE', 'Estonia'],
  ['FI', 'Finland'],
  ['FR', 'France'],
  ['GE', 'Georgia'],
  ['DE', 'Germany'],
  ['GH', 'Ghana'],
  ['GR', 'Greece'],
  ['HK', 'Hong Kong'],
  ['HU', 'Hungary'],
  ['IN', 'India'],
  ['ID', 'Indonesia'],
  ['IR', 'Iran'],
  ['IQ', 'Iraq'],
  ['IE', 'Ireland'],
  ['IT', 'Italy'],
  ['JP', 'Japan'],
  ['JO', 'Jordan'],
  ['KZ', 'Kazakhstan'],
  ['KE', 'Kenya'],
  ['KW', 'Kuwait'],
  ['KG', 'Kyrgyzstan'],
  ['LV', 'Latvia'],
  ['LB', 'Lebanon'],
  ['LT', 'Lithuania'],
  ['LU', 'Luxembourg'],
  ['MY', 'Malaysia'],
  ['MX', 'Mexico'],
  ['MA', 'Morocco'],
  ['NL', 'Netherlands'],
  ['NZ', 'New Zealand'],
  ['NG', 'Nigeria'],
  ['NO', 'Norway'],
  ['OM', 'Oman'],
  ['PK', 'Pakistan'],
  ['PH', 'Philippines'],
  ['PL', 'Poland'],
  ['PT', 'Portugal'],
  ['QA', 'Qatar'],
  ['RO', 'Romania'],
  ['RU', 'Russia'],
  ['SA', 'Saudi Arabia'],
  ['SG', 'Singapore'],
  ['SK', 'Slovakia'],
  ['SI', 'Slovenia'],
  ['ZA', 'South Africa'],
  ['KR', 'South Korea'],
  ['ES', 'Spain'],
  ['LK', 'Sri Lanka'],
  ['SE', 'Sweden'],
  ['CH', 'Switzerland'],
  ['TW', 'Taiwan'],
  ['TJ', 'Tajikistan'],
  ['TH', 'Thailand'],
  ['TN', 'Tunisia'],
  ['TR', 'Turkey'],
  ['TM', 'Turkmenistan'],
  ['AE', 'United Arab Emirates'],
  ['GB', 'United Kingdom'],
  ['US', 'United States'],
  ['UZ', 'Uzbekistan'],
  ['VN', 'Vietnam'],
] as const;

export const PRODUCT_ORIGIN_COUNTRIES: ProductOrigin[] = countries.map(([code, name]) => ({
  code,
  name,
  flagUrl: flagUrl(code),
}));

export const PRODUCT_ORIGIN_DATALIST_ID = 'product-origin-country-list';

export const productOriginKey = (origin: ProductOrigin): string => origin.code || origin.name;

export function findProductOriginCountry(value: unknown): ProductOrigin | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const normalized = raw.toLowerCase();
  return PRODUCT_ORIGIN_COUNTRIES.find((country) => (
    country.code.toLowerCase() === normalized ||
    country.name.toLowerCase() === normalized ||
    `${country.name} (${country.code})`.toLowerCase() === normalized
  ));
}

export function normalizeProductOrigin(value: unknown): ProductOrigin | undefined {
  if (value == null) return undefined;

  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return undefined;
    return findProductOriginCountry(raw) || { code: '', name: raw, flagUrl: '' };
  }

  if (typeof value === 'object') {
    const row = value as Record<string, unknown>;
    const code = String(row.code ?? row.iso2 ?? row.countryCode ?? '').trim().toUpperCase();
    const name = String(row.name ?? row.countryName ?? row.label ?? row.title ?? '').trim();
    const matched = findProductOriginCountry(code) || findProductOriginCountry(name);
    if (matched) return matched;
    if (!code && !name) return undefined;
    return {
      code,
      name: name || code,
      flagUrl: String(row.flagUrl ?? row.flag ?? row.image ?? '').trim(),
    };
  }

  return undefined;
}
