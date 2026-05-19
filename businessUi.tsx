import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  Calculator,
  Copy,
  Download,
  FileJson,
  LayoutGrid,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type {
  BusinessCatalogOptions,
  BusinessItem,
  BusinessItemType,
  BusinessKind,
  BusinessPricingModel,
  BusinessProfile,
  BusinessScenario,
  BusinessScenarioLine,
} from './types';
import {
  buildBusinessAiPrompt,
  buildFullBusinessSampleJson,
  buildMinimalBusinessSampleJson,
  BUSINESS_JSON_SCHEMA_VERSION,
  getBusinessJsonFieldGuideFa,
} from './businessJsonFormat';
import { buildBusinessCatalogHtml } from './businessCatalog';
import {
  BUSINESS_ITEM_TYPE_OPTIONS,
  BUSINESS_KIND_OPTIONS,
  BUSINESS_PRICING_OPTIONS,
  calculateScenario,
  itemTypeLabel,
  kindLabel,
  newBusinessId,
  newBusinessItemId,
  newBusinessScenarioId,
  normalizeBusinessItem,
  normalizeBusinessProfile,
  normalizeBusinessScenario,
  parseBusinessImportJson,
  pricingModelLabel,
  resolveScenarioImports,
} from './businessCore';
import { formatThousandsWhileTyping, parseFormattedNumber } from './numericInputFormat';

export type BusinessPanelProps = {
  profiles: BusinessProfile[];
  setProfiles: React.Dispatch<React.SetStateAction<BusinessProfile[]>>;
  items: BusinessItem[];
  setItems: React.Dispatch<React.SetStateAction<BusinessItem[]>>;
  scenarios: BusinessScenario[];
  setScenarios: React.Dispatch<React.SetStateAction<BusinessScenario[]>>;
  activeBusinessId: string;
  setActiveBusinessId: React.Dispatch<React.SetStateAction<string>>;
};

type TabId = 'profile' | 'items' | 'scenarios' | 'catalog' | 'import';

const labelCls = 'text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1';
const inputCls =
  'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-violet-400 outline-none';

function kindIcon(kind: BusinessKind) {
  if (kind === 'restaurant') return UtensilsCrossed;
  if (kind === 'real_estate') return Building2;
  return Briefcase;
}

function emptyItem(businessId: string, profile: BusinessProfile): BusinessItem {
  return normalizeBusinessItem(
    {
      id: newBusinessItemId(),
      businessId,
      name: '',
      itemType: profile.kind === 'restaurant' ? 'menu_item' : profile.kind === 'real_estate' ? 'property' : 'product',
      category: 'عمومی',
      unit: 'عدد',
      unitPrice: 0,
      costPrice: 0,
      currency: profile.defaultCurrency,
      pricingModel: profile.kind === 'real_estate' ? 'per_month' : 'per_unit',
      notes: '',
      customFields: {},
      active: true,
    },
    profile,
  );
}

export function BusinessPanel({
  profiles,
  setProfiles,
  items,
  setItems,
  scenarios,
  setScenarios,
  activeBusinessId,
  setActiveBusinessId,
}: BusinessPanelProps) {
  const [tab, setTab] = useState<TabId>('profile');
  const [search, setSearch] = useState('');
  const [itemForm, setItemForm] = useState<BusinessItem | null>(null);
  const [customFieldDraft, setCustomFieldDraft] = useState({ key: '', value: '' });
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [profileDraft, setProfileDraft] = useState<BusinessProfile | null>(null);
  const [catalogOptions, setCatalogOptions] = useState<BusinessCatalogOptions>({ showImages: true });
  const [showJsonGuide, setShowJsonGuide] = useState(false);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeBusinessId) ?? null,
    [profiles, activeBusinessId],
  );

  const businessItems = useMemo(
    () => items.filter((i) => i.businessId === activeBusinessId),
    [items, activeBusinessId],
  );

  const businessScenarios = useMemo(
    () => scenarios.filter((s) => s.businessId === activeBusinessId),
    [scenarios, activeBusinessId],
  );

  const selectedScenario = useMemo(
    () => businessScenarios.find((s) => s.id === selectedScenarioId) ?? businessScenarios[0] ?? null,
    [businessScenarios, selectedScenarioId],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return businessItems;
    return businessItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku || '').toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [businessItems, search]);

  const scenarioTotals = useMemo(() => {
    if (!selectedScenario) return null;
    return calculateScenario(selectedScenario, businessItems);
  }, [selectedScenario, businessItems]);

  const ensureActive = () => {
    if (activeProfile) return activeProfile;
    alert('ابتدا یک کسب‌وکار ایجاد یا انتخاب کنید.');
    return null;
  };

  const createBusiness = () => {
    const p = normalizeBusinessProfile({
      id: newBusinessId(),
      name: 'کسب‌وکار جدید',
      kind: 'custom',
      defaultCurrency: 'USD',
    });
    setProfiles((prev) => [...prev, p]);
    setActiveBusinessId(p.id);
    setProfileDraft(p);
    setTab('profile');
  };

  const saveProfileDraft = () => {
    if (!profileDraft) return;
    const next = { ...profileDraft, updatedAt: Date.now() };
    setProfiles((prev) => prev.map((p) => (p.id === next.id ? next : p)));
    setProfileDraft(null);
  };

  const deleteBusiness = (id: string) => {
    if (!window.confirm('این کسب‌وکار و تمام اقلام و سناریوهایش حذف شوند؟')) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setItems((prev) => prev.filter((i) => i.businessId !== id));
    setScenarios((prev) => prev.filter((s) => s.businessId !== id));
    if (activeBusinessId === id) {
      const rest = profiles.filter((p) => p.id !== id);
      setActiveBusinessId(rest[0]?.id ?? '');
    }
  };

  const saveItem = (item: BusinessItem) => {
    const norm = normalizeBusinessItem(item, activeProfile ?? undefined);
    if (!norm.name.trim()) {
      alert('نام آیتم الزامی است.');
      return;
    }
    setItems((prev) => {
      const ix = prev.findIndex((x) => x.id === norm.id);
      if (ix >= 0) {
        const copy = [...prev];
        copy[ix] = { ...norm, updatedAt: Date.now() };
        return copy;
      }
      return [...prev, norm];
    });
    setItemForm(null);
  };

  const runImport = () => {
    const profile = ensureActive();
    if (!profile) return;
    try {
      const { profilePatch, items: imported, scenarioImports, catalog, warnings } =
        parseBusinessImportJson(importText);
      if (profilePatch) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profile.id
              ? normalizeBusinessProfile({
                  ...p,
                  ...profilePatch,
                  id: p.id,
                  updatedAt: Date.now(),
                })
              : p,
          ),
        );
      }
      if (catalog) setCatalogOptions((prev) => ({ ...prev, ...catalog }));
      const mapped = imported.map((row) =>
        normalizeBusinessItem(
          {
            ...row,
            id: newBusinessItemId(),
            businessId: profile.id,
          },
          profile,
        ),
      );
      const kept =
        importMode === 'replace' ? [] : items.filter((i) => i.businessId === profile.id);
      const merged = [...kept, ...mapped];
      setItems((prev) => [...prev.filter((i) => i.businessId !== profile.id), ...merged]);

      const allWarnings = [...warnings];
      if (scenarioImports.length > 0) {
        const { scenarios: resolved, warnings: sw } = resolveScenarioImports(
          scenarioImports,
          profile.id,
          merged,
        );
        if (importMode === 'replace') {
          setScenarios((prev) => [
            ...prev.filter((s) => s.businessId !== profile.id),
            ...resolved,
          ]);
        } else {
          setScenarios((prev) => [...prev, ...resolved]);
        }
        allWarnings.push(...sw);
      }

      const msg = [
        `${mapped.length} آیتم وارد شد.`,
        scenarioImports.length > 0 ? `${scenarioImports.length} سناریو پردازش شد.` : '',
        ...allWarnings,
      ]
        .filter(Boolean)
        .join('\n');
      alert(msg || 'انجام شد.');
      setImportText('');
      setTab(scenarioImports.length > 0 ? 'scenarios' : 'items');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const exportJson = () => {
    const profile = ensureActive();
    if (!profile) return;
    const payload = {
      _schema: 'cloudexport-business-v1',
      _schemaVersion: BUSINESS_JSON_SCHEMA_VERSION,
      business: {
        name: profile.name,
        kind: profile.kind,
        description: profile.description,
        defaultCurrency: profile.defaultCurrency,
        contactPhone: profile.contactPhone,
        contactEmail: profile.contactEmail,
        address: profile.address,
        website: profile.website,
        logoUrl: profile.logoUrl,
      },
      items: businessItems.map((it) => ({
        name: it.name,
        sku: it.sku,
        itemType: it.itemType,
        category: it.category,
        unit: it.unit,
        unitPrice: it.unitPrice,
        costPrice: it.costPrice,
        currency: it.currency,
        pricingModel: it.pricingModel,
        imageUrl: it.imageUrl,
        notes: it.notes,
        customFields: it.customFields,
        active: it.active,
      })),
      scenarios: businessScenarios.map((s) => ({
        name: s.name,
        globalDiscountPercent: s.globalDiscountPercent,
        fixedCosts: s.fixedCosts ?? 0,
        notes: s.notes,
        lines: s.lines.map((l) => {
          const it = businessItems.find((i) => i.id === l.itemId);
          return {
            itemSku: it?.sku,
            itemName: it?.name,
            qty: l.qty,
            unitPriceOverride: l.unitPriceOverride,
            discountPercent: l.discountPercent,
          };
        }),
      })),
      catalog: catalogOptions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `business_${profile.name.replace(/\s+/g, '_').slice(0, 40)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openCatalogPrint = () => {
    const profile = ensureActive();
    if (!profile) return;
    const html = buildBusinessCatalogHtml(profile, businessItems, catalogOptions.title, catalogOptions);
    const w = window.open('', '_blank');
    if (!w) {
      alert('پاپ‌آپ مسدود است.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const addScenario = () => {
    const profile = ensureActive();
    if (!profile) return;
    const sc = normalizeBusinessScenario({
      id: newBusinessScenarioId(),
      businessId: profile.id,
      name: `سناریو ${businessScenarios.length + 1}`,
      lines: [],
    });
    setScenarios((prev) => [...prev, sc]);
    setSelectedScenarioId(sc.id);
    setTab('scenarios');
  };

  const updateScenario = (patch: Partial<BusinessScenario>) => {
    if (!selectedScenario) return;
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === selectedScenario.id
          ? normalizeBusinessScenario({ ...s, ...patch, updatedAt: Date.now() })
          : s,
      ),
    );
  };

  const addLineToScenario = (itemId: string) => {
    if (!selectedScenario) return;
    if (selectedScenario.lines.some((l) => l.itemId === itemId)) return;
    const line: BusinessScenarioLine = { itemId, qty: 1, discountPercent: 0 };
    updateScenario({ lines: [...selectedScenario.lines, line] });
  };

  const tabBtn = (id: TabId, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
        tab === id ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-l from-violet-700 to-indigo-800 rounded-xl text-white p-5 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              مدیریت کسب‌وکار
            </h2>
            <p className="text-sm text-violet-100 mt-1 max-w-xl">
              کسب‌وکار خود را تعریف کنید، کالا/خدمت/منو/ملک را دستی یا با JSON وارد کنید، سناریو بسازید و
              کاتالوگ چاپ کنید.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={createBusiness}
              className="text-sm font-semibold bg-white text-violet-800 px-3 py-2 rounded-lg hover:bg-violet-50 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> کسب‌وکار جدید
            </button>
            <button
              type="button"
              onClick={exportJson}
              disabled={!activeProfile}
              className="text-sm font-semibold bg-violet-500/40 px-3 py-2 rounded-lg hover:bg-violet-500/60 flex items-center gap-1 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> خروجی JSON
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
        {tabBtn('profile', 'کسب‌وکار', Briefcase)}
        {tabBtn('items', 'اقلام', LayoutGrid)}
        {tabBtn('scenarios', 'سناریو', Calculator)}
        {tabBtn('catalog', 'کاتالوگ', Printer)}
        {tabBtn('import', 'ورود JSON', FileJson)}
      </div>

      {!activeProfile && tab !== 'profile' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-900 text-sm">
          هنوز کسب‌وکاری انتخاب نشده. از تب «کسب‌وکار» یک مورد بسازید یا انتخاب کنید.
        </div>
      )}

      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 space-y-2 max-h-[28rem] overflow-y-auto">
            <p className={labelCls}>لیست کسب‌وکارها</p>
            {profiles.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">هنوز ثبت نشده — دکمه «کسب‌وکار جدید»</p>
            )}
            {profiles.map((p) => {
              const Icon = kindIcon(p.kind);
              const isActive = p.id === activeBusinessId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActiveBusinessId(p.id);
                    setProfileDraft(null);
                  }}
                  className={`w-full text-right p-3 rounded-lg border transition-colors ${
                    isActive ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-violet-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{kindLabel(p.kind)} · {p.defaultCurrency}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
            {activeProfile ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800">ویرایش کسب‌وکار فعال</h3>
                  <button
                    type="button"
                    onClick={() => deleteBusiness(activeProfile.id)}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
                {(() => {
                  const draft = profileDraft ?? activeProfile;
                  const setDraft = (patch: Partial<BusinessProfile>) =>
                    setProfileDraft({ ...draft, ...patch, updatedAt: Date.now() });
                  return (
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>نام کسب‌وکار</label>
                        <input
                          className={inputCls}
                          dir="rtl"
                          value={draft.name}
                          onChange={(e) => setDraft({ name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>نوع فعالیت</label>
                        <select
                          className={inputCls}
                          value={draft.kind}
                          onChange={(e) => setDraft({ kind: e.target.value as BusinessKind })}
                        >
                          {BUSINESS_KIND_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {BUSINESS_KIND_OPTIONS.find((o) => o.value === draft.kind)?.hint}
                        </p>
                      </div>
                      <div>
                        <label className={labelCls}>ارز پیش‌فرض</label>
                        <input
                          className={inputCls}
                          dir="ltr"
                          value={draft.defaultCurrency}
                          onChange={(e) => setDraft({ defaultCurrency: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>توضیحات</label>
                        <textarea
                          className={inputCls + ' min-h-[80px]'}
                          dir="rtl"
                          value={draft.description}
                          onChange={(e) => setDraft({ description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>تلفن</label>
                          <input
                            className={inputCls}
                            dir="ltr"
                            value={draft.contactPhone ?? ''}
                            onChange={(e) => setDraft({ contactPhone: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>ایمیل</label>
                          <input
                            className={inputCls}
                            dir="ltr"
                            value={draft.contactEmail ?? ''}
                            onChange={(e) => setDraft({ contactEmail: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>آدرس</label>
                        <input
                          className={inputCls}
                          dir="rtl"
                          value={draft.address ?? ''}
                          onChange={(e) => setDraft({ address: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>وب‌سایت</label>
                          <input
                            className={inputCls}
                            dir="ltr"
                            value={draft.website ?? ''}
                            onChange={(e) => setDraft({ website: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>لوگو (URL)</label>
                          <input
                            className={inputCls}
                            dir="ltr"
                            value={draft.logoUrl ?? ''}
                            onChange={(e) => setDraft({ logoUrl: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={saveProfileDraft}
                          className="flex-1 bg-violet-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-violet-700"
                        >
                          ذخیره تغییرات
                        </button>
                        {profileDraft && (
                          <button
                            type="button"
                            onClick={() => setProfileDraft(null)}
                            className="px-4 text-sm border border-slate-200 rounded-lg"
                          >
                            انصراف
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 border-t pt-3">
                        {businessItems.length} آیتم · {businessScenarios.length} سناریو
                      </p>
                    </div>
                  );
                })()}
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">کسب‌وکار جدید بسازید یا از لیست انتخاب کنید.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'items' && activeProfile && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                className={inputCls + ' pr-9'}
                placeholder="جستجو نام، SKU، دسته…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                dir="rtl"
              />
            </div>
            <button
              type="button"
              onClick={() => setItemForm(emptyItem(activeProfile.id, activeProfile))}
              className="text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> آیتم دستی
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-right px-3 py-2">نام</th>
                  <th className="text-right px-3 py-2">نوع</th>
                  <th className="text-right px-3 py-2">دسته</th>
                  <th className="text-right px-3 py-2">قیمت</th>
                  <th className="text-right px-3 py-2">هزینه</th>
                  <th className="text-center px-3 py-2">فعال</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{it.name}</td>
                    <td className="px-3 py-2 text-slate-600">{itemTypeLabel(it.itemType)}</td>
                    <td className="px-3 py-2">{it.category}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {it.unitPrice.toLocaleString()} {it.currency}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                      {it.costPrice > 0 ? it.costPrice.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={it.active}
                        onChange={() =>
                          setItems((prev) =>
                            prev.map((x) => (x.id === it.id ? { ...x, active: !x.active } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setItemForm({ ...it })}
                        className="text-violet-600 hover:text-violet-800 p-1"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm('حذف شود؟')) return;
                          setItems((prev) => prev.filter((x) => x.id !== it.id));
                          setScenarios((prev) =>
                            prev.map((s) => ({
                              ...s,
                              lines: s.lines.filter((l) => l.itemId !== it.id),
                            })),
                          );
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <p className="text-center text-slate-500 py-8 text-sm">آیتمی نیست — دستی اضافه کنید یا JSON وارد کنید.</p>
            )}
          </div>
        </div>
      )}

      {/* Item modal - truncated in thought but full form below */}
      {itemForm && activeProfile && (
        <ItemFormModal
          item={itemForm}
          profile={activeProfile}
          onClose={() => setItemForm(null)}
          onSave={saveItem}
          customFieldDraft={customFieldDraft}
          setCustomFieldDraft={setCustomFieldDraft}
        />
      )}

      {tab === 'scenarios' && activeProfile && (
        <ScenarioTab
          items={businessItems}
          scenarios={businessScenarios}
          selectedScenario={selectedScenario}
          selectedScenarioId={selectedScenarioId}
          setSelectedScenarioId={setSelectedScenarioId}
          scenarioTotals={scenarioTotals}
          onAddScenario={addScenario}
          onUpdateScenario={updateScenario}
          onAddLine={addLineToScenario}
          onDeleteScenario={(id) => {
            if (!window.confirm('سناریو حذف شود؟')) return;
            setScenarios((prev) => prev.filter((s) => s.id !== id));
            if (selectedScenarioId === id) setSelectedScenarioId('');
          }}
        />
      )}

      {tab === 'catalog' && activeProfile && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4">
          <p className="text-slate-600 text-sm">
            پیش‌نمایش کاتالوگ {businessItems.filter((i) => i.active).length} آیتم فعال — {activeProfile.name}
          </p>
          <button
            type="button"
            onClick={openCatalogPrint}
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-violet-700"
          >
            <Printer className="w-5 h-5" /> مشاهده و چاپ کاتالوگ
          </button>
        </div>
      )}

      {tab === 'import' && activeProfile && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs bg-violet-50 border border-violet-100 rounded-lg p-3 text-violet-900 leading-relaxed">
            <strong>برای هوش مصنوعی:</strong> «کپی پرامپت AI» را در چت Paste کنید، یا «نمونه کامل» را ویرایش
            کنید. خروجی AI را اینجا وارد کنید — اقلام، سناریو، سود و کاتالوگ با تصویر ساخته می‌شود.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setImportText(buildFullBusinessSampleJson(activeProfile.kind))}
              className="text-xs border border-violet-300 bg-violet-50 text-violet-800 px-3 py-1.5 rounded-lg hover:bg-violet-100 font-semibold"
            >
              نمونه کامل (اقلام + سناریو + کاتالوگ)
            </button>
            <button
              type="button"
              onClick={() => setImportText(buildMinimalBusinessSampleJson(activeProfile.kind))}
              className="text-xs border border-violet-200 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-50"
            >
              نمونه سریع
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(buildFullBusinessSampleJson(activeProfile.kind));
              }}
              className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> کپی نمونه کامل
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  buildBusinessAiPrompt(activeProfile.kind, activeProfile.name),
                );
                alert('دستورالعمل AI در کلیپ‌بورد کپی شد.');
              }}
              className="text-xs border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 font-semibold"
            >
              کپی پرامپت AI
            </button>
            <button
              type="button"
              onClick={() => setShowJsonGuide((v) => !v)}
              className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg"
            >
              {showJsonGuide ? 'بستن راهنما' : 'راهنمای فیلدها'}
            </button>
          </div>
          {showJsonGuide && (
            <pre className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono text-slate-700 max-h-48 overflow-y-auto">
              {getBusinessJsonFieldGuideFa()}
            </pre>
          )}
          <textarea
            className={inputCls + ' min-h-[280px] font-mono text-[11px]'}
            dir="ltr"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{ "_schema": "cloudexport-business-v1", "business": {}, "items": [], "scenarios": [], "catalog": {} }'
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              ادغام با اقلام فعلی
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
              جایگزینی اقلام + سناریوهای این کسب‌وکار
            </label>
          </div>
          <button
            type="button"
            onClick={runImport}
            className="bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-emerald-700"
          >
            <Upload className="w-4 h-4" /> ورود JSON
          </button>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            فرمت {BUSINESS_JSON_SCHEMA_VERSION}: business، items (imageUrl)، scenarios (itemSku، fixedCosts)،
            catalog (چاپ). دکمه «خروجی JSON» در بالا همان ساختار را صادر می‌کند — مناسب برای AI.
          </p>
        </div>
      )}
    </div>
  );
}

function ItemFormModal({
  item,
  profile,
  onClose,
  onSave,
  customFieldDraft,
  setCustomFieldDraft,
}: {
  item: BusinessItem;
  profile: BusinessProfile;
  onClose: () => void;
  onSave: (item: BusinessItem) => void;
  customFieldDraft: { key: string; value: string };
  setCustomFieldDraft: React.Dispatch<React.SetStateAction<{ key: string; value: string }>>;
}) {
  const [draft, setDraft] = useState(item);
  const set = (patch: Partial<BusinessItem>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">{draft.id === item.id && !item.name ? 'آیتم جدید' : 'ویرایش آیتم'}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>نام</label>
            <input className={inputCls} dir="rtl" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>نوع</label>
              <select
                className={inputCls}
                value={draft.itemType}
                onChange={(e) => set({ itemType: e.target.value as BusinessItemType })}
              >
                {BUSINESS_ITEM_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>دسته</label>
              <input className={inputCls} dir="rtl" value={draft.category} onChange={(e) => set({ category: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>قیمت فروش</label>
              <input
                className={inputCls}
                dir="ltr"
                value={formatThousandsWhileTyping(String(draft.unitPrice || ''))}
                onChange={(e) => set({ unitPrice: parseFormattedNumber(e.target.value) ?? 0 })}
              />
            </div>
            <div>
              <label className={labelCls}>هزینه / بهای تمام</label>
              <input
                className={inputCls}
                dir="ltr"
                value={formatThousandsWhileTyping(String(draft.costPrice || ''))}
                onChange={(e) => set({ costPrice: parseFormattedNumber(e.target.value) ?? 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>ارز</label>
              <input className={inputCls} dir="ltr" value={draft.currency} onChange={(e) => set({ currency: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>واحد</label>
              <input className={inputCls} dir="rtl" value={draft.unit} onChange={(e) => set({ unit: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>مدل قیمت</label>
              <select
                className={inputCls}
                value={draft.pricingModel}
                onChange={(e) => set({ pricingModel: e.target.value as BusinessPricingModel })}
              >
                {BUSINESS_PRICING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>یادداشت</label>
            <textarea className={inputCls} rows={2} dir="rtl" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>تصویر (URL)</label>
            <input
              className={inputCls}
              dir="ltr"
              placeholder="https://..."
              value={draft.imageUrl ?? ''}
              onChange={(e) => set({ imageUrl: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>فیلدهای اضافی (مثلاً متراژ، تعداد خواب)</label>
            <div className="flex gap-2 mb-2">
              <input
                className={inputCls}
                placeholder="کلید"
                value={customFieldDraft.key}
                onChange={(e) => setCustomFieldDraft((d) => ({ ...d, key: e.target.value }))}
              />
              <input
                className={inputCls}
                placeholder="مقدار"
                value={customFieldDraft.value}
                onChange={(e) => setCustomFieldDraft((d) => ({ ...d, value: e.target.value }))}
              />
              <button
                type="button"
                className="text-xs bg-slate-100 px-2 rounded-lg border"
                onClick={() => {
                  const k = customFieldDraft.key.trim();
                  if (!k) return;
                  set({
                    customFields: { ...draft.customFields, [k]: customFieldDraft.value },
                  });
                  setCustomFieldDraft({ key: '', value: '' });
                }}
              >
                +
              </button>
            </div>
            {Object.entries(draft.customFields).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs bg-slate-50 rounded px-2 py-1 mb-1">
                <span>
                  {k}: {v}
                </span>
                <button
                  type="button"
                  className="text-red-500"
                  onClick={() => {
                    const next = { ...draft.customFields };
                    delete next[k];
                    set({ customFields: next });
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="w-full bg-violet-600 text-white font-semibold py-2.5 rounded-lg hover:bg-violet-700"
          >
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}

function ScenarioTab({
  items,
  scenarios,
  selectedScenario,
  selectedScenarioId,
  setSelectedScenarioId,
  scenarioTotals,
  onAddScenario,
  onUpdateScenario,
  onAddLine,
  onDeleteScenario,
}: {
  items: BusinessItem[];
  scenarios: BusinessScenario[];
  selectedScenario: BusinessScenario | null;
  selectedScenarioId: string;
  setSelectedScenarioId: (id: string) => void;
  scenarioTotals: ReturnType<typeof calculateScenario> | null;
  onAddScenario: () => void;
  onUpdateScenario: (patch: Partial<BusinessScenario>) => void;
  onAddLine: (itemId: string) => void;
  onDeleteScenario: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <p className={labelCls + ' mb-0'}>سناریوها</p>
          <button type="button" onClick={onAddScenario} className="text-violet-600 text-xs font-semibold flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> جدید
          </button>
        </div>
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedScenarioId(s.id)}
            className={`w-full text-right p-2 rounded-lg border text-sm ${
              s.id === selectedScenarioId ? 'border-violet-500 bg-violet-50' : 'border-slate-200'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="xl:col-span-2 space-y-4">
        {selectedScenario && scenarioTotals ? (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className={labelCls}>نام سناریو</label>
                <input
                  className={inputCls}
                  value={selectedScenario.name}
                  onChange={(e) => onUpdateScenario({ name: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="w-28">
                <label className={labelCls}>تخفیف کل %</label>
                <input
                  type="number"
                  className={inputCls}
                  min={0}
                  max={100}
                  value={selectedScenario.globalDiscountPercent}
                  onChange={(e) =>
                    onUpdateScenario({ globalDiscountPercent: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="w-36">
                <label className={labelCls}>هزینه ثابت</label>
                <input
                  className={inputCls}
                  dir="ltr"
                  value={formatThousandsWhileTyping(String(selectedScenario.fixedCosts ?? ''))}
                  onChange={(e) =>
                    onUpdateScenario({ fixedCosts: parseFormattedNumber(e.target.value) ?? 0 })
                  }
                />
              </div>
              <button type="button" onClick={() => onDeleteScenario(selectedScenario.id)} className="text-red-600 text-xs">
                حذف سناریو
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-[10px] uppercase text-emerald-700 font-semibold">درآمد</p>
                <p className="text-xl font-bold text-emerald-800">{scenarioTotals.revenue.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-[10px] uppercase text-slate-600 font-semibold">هزینه</p>
                <p className="text-xl font-bold">{scenarioTotals.cost.toLocaleString()}</p>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-center">
                <p className="text-[10px] uppercase text-violet-700 font-semibold">سود · {scenarioTotals.marginPct.toFixed(1)}%</p>
                <p className="text-xl font-bold text-violet-800">{scenarioTotals.profit.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto">
                <p className={labelCls}>افزودن از کاتالوگ</p>
                {items.filter((i) => i.active).map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onAddLine(it.id)}
                    className="w-full text-right text-xs py-2 border-b border-slate-100 hover:bg-slate-50"
                  >
                    + {it.name} ({it.unitPrice.toLocaleString()} {it.currency})
                  </button>
                ))}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-right p-2">آیتم</th>
                      <th className="p-2">تعداد</th>
                      <th className="p-2">تخفیف%</th>
                      <th className="p-2">جمع</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioTotals.lines.map((row) => (
                      <tr key={row.line.itemId} className="border-t border-slate-100">
                        <td className="p-2">{row.item.name}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            className="w-16 border rounded px-1"
                            value={row.line.qty}
                            onChange={(e) => {
                              const qty = parseFloat(e.target.value) || 0;
                              onUpdateScenario({
                                lines: selectedScenario.lines.map((l) =>
                                  l.itemId === row.line.itemId ? { ...l, qty } : l,
                                ),
                              });
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="w-14 border rounded px-1"
                            value={row.line.discountPercent}
                            onChange={(e) => {
                              const discountPercent = parseFloat(e.target.value) || 0;
                              onUpdateScenario({
                                lines: selectedScenario.lines.map((l) =>
                                  l.itemId === row.line.itemId ? { ...l, discountPercent } : l,
                                ),
                              });
                            }}
                          />
                        </td>
                        <td className="p-2 font-medium">{row.lineRevenue.toLocaleString()}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            className="text-red-500"
                            onClick={() =>
                              onUpdateScenario({
                                lines: selectedScenario.lines.filter((l) => l.itemId !== row.line.itemId),
                              })
                            }
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-slate-500 py-12 text-sm">سناریویی نیست — «جدید» بزنید.</p>
        )}
      </div>
    </div>
  );
}
