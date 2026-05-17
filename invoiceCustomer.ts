import type { Buyer } from './types';

export type InvoiceCustomerFields = {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  address: string;
};

export function buyerFullName(b: Pick<Buyer, 'firstName' | 'lastName' | 'name'>): string {
  const fromParts = [b.firstName, b.lastName].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
  if (fromParts) return fromParts;
  return String(b.name || '').trim();
}

export function buyerDisplayLabel(b: Buyer): string {
  const person = buyerFullName(b);
  if (person && b.company) return `${person} · ${b.company}`;
  return person || b.company || '—';
}

export function normalizeBuyerRecord(b: Buyer): Buyer {
  const firstName = String(b.firstName ?? '').trim();
  const lastName = String(b.lastName ?? '').trim();
  const legacyName = String(b.name ?? '').trim();
  let fn = firstName;
  let ln = lastName;
  let name = legacyName;
  if (!fn && !ln && legacyName) {
    const parts = legacyName.split(/\s+/);
    if (parts.length >= 2) {
      fn = parts[0];
      ln = parts.slice(1).join(' ');
    } else {
      fn = legacyName;
    }
    name = [fn, ln].filter(Boolean).join(' ');
  } else if (fn || ln) {
    name = [fn, ln].filter(Boolean).join(' ');
  }
  return { ...b, firstName: fn, lastName: ln, name };
}

export function parseBuyersFromStorage(raw: unknown): Buyer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x, i) =>
      normalizeBuyerRecord({
        id: Number(x.id) || Date.now() + i,
        firstName: String(x.firstName ?? ''),
        lastName: String(x.lastName ?? ''),
        name: String(x.name ?? ''),
        company: String(x.company ?? ''),
        email: String(x.email ?? ''),
        phone: String(x.phone ?? ''),
        country: String(x.country ?? ''),
        destinationPort: String(x.destinationPort ?? ''),
        incoterm: String(x.incoterm ?? ''),
        paymentTerms: String(x.paymentTerms ?? ''),
        address: String(x.address ?? ''),
        notes: String(x.notes ?? ''),
        vatId: x.vatId ? String(x.vatId) : undefined,
        lastOrderAt: x.lastOrderAt !== undefined ? Number(x.lastOrderAt) : undefined,
      })
    );
}

export function invoiceCustomerFromBuyer(b: Buyer): InvoiceCustomerFields {
  const n = normalizeBuyerRecord(b);
  return {
    firstName: n.firstName || '',
    lastName: n.lastName || '',
    company: n.company || '',
    email: n.email || '',
    phone: n.phone || '',
    address: buildInvoiceCustomerAddressBlock(n),
  };
}

export function buildInvoiceCustomerAddressBlock(b: Buyer): string {
  const lines: string[] = [];
  if (b.address?.trim()) lines.push(b.address.trim());
  const cityCountry = [b.destinationPort, b.country].filter(Boolean).join(', ').trim();
  if (cityCountry) lines.push(cityCountry);
  return lines.join('\n');
}

export function buyerFromInvoiceCustomer(
  fields: InvoiceCustomerFields,
  extra: Partial<Buyer> = {}
): Omit<Buyer, 'id'> {
  const firstName = fields.firstName.trim();
  const lastName = fields.lastName.trim();
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return {
    name: name || fields.company.trim() || 'Customer',
    firstName,
    lastName,
    company: fields.company.trim(),
    email: fields.email.trim(),
    phone: fields.phone.trim(),
    address: fields.address.trim(),
    country: extra.country ?? '',
    destinationPort: extra.destinationPort ?? '',
    incoterm: extra.incoterm ?? '',
    paymentTerms: extra.paymentTerms ?? '',
    notes: extra.notes ?? '',
    vatId: extra.vatId,
    lastOrderAt: Date.now(),
  };
}

export function customerDisplayName(fields: InvoiceCustomerFields): string {
  const person = [fields.firstName, fields.lastName].map((x) => x.trim()).filter(Boolean).join(' ');
  return person || fields.company.trim() || '';
}
