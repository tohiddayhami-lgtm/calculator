import type { BusinessItem, BusinessProfile, BusinessScenario } from './types';
import {
  normalizeBusinessItem,
  normalizeBusinessProfile,
  normalizeBusinessScenario,
} from './businessCore';

export function parseBusinessProfiles(raw: unknown): BusinessProfile[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => normalizeBusinessProfile(r as Partial<BusinessProfile>));
}

export function parseBusinessItems(raw: unknown, profiles: BusinessProfile[]): BusinessItem[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return raw
    .map((r) => {
      const o = r as Partial<BusinessItem>;
      const bid = String(o.businessId ?? '');
      if (!bid) return null;
      return normalizeBusinessItem({ ...o, businessId: bid }, byId.get(bid));
    })
    .filter(Boolean) as BusinessItem[];
}

export function parseBusinessScenarios(raw: unknown): BusinessScenario[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = r as Partial<BusinessScenario>;
      const bid = String(o.businessId ?? '');
      if (!bid) return null;
      return normalizeBusinessScenario({ ...o, businessId: bid });
    })
    .filter(Boolean) as BusinessScenario[];
}
