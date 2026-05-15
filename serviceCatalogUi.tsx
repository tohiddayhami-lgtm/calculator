import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Download,
  Upload,
  Trash2,
  Save,
  Globe,
  Link2,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  X,
  Eye,
  Loader2,
  Palette,
  Package,
  Layers,
  ShoppingCart,
} from 'lucide-react';
import type { ServiceCatalogDef, ServiceCatalogItem, CatalogConfig } from './types';
import {
  SAMPLE_SERVICE_CATALOG_JSON,
  createBlankServiceCatalogDef,
  parseServiceCatalogJson,
  newServiceCatalogItemId,
} from './serviceCatalog';
import { compressCatalogImage, readFileAsDataUrl } from './serviceCatalogImages';
import { CatalogPagesVisualEditor } from './serviceCatalogPagesEditor';

export type ServiceCatalogShareInfo = {
  catalogId: string;
  url: string;
  shortUrl?: string;
  qr?: string;
  uploading?: boolean;
  error?: string;
};

export type ServiceCatalogBuilderPanelProps = {
  catalogs: ServiceCatalogDef[];
  outputCurrency: string;
  saving: boolean;
  publishingId: string | null;
  shareInfo: ServiceCatalogShareInfo | null;
  onSave: (def: ServiceCatalogDef) => Promise<void>;
  onPublish: (def: ServiceCatalogDef) => Promise<void>;
  onUnpublish: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPreview: (def: ServiceCatalogDef) => void;
  onClearShare: () => void;
};

type EditorTab = 'import' | 'branding' | 'items' | 'pages' | 'publish';

export function ServiceCatalogBuilderPanel({
  catalogs,
  outputCurrency,
  saving,
  publishingId,
  shareInfo,
  onSave,
  onPublish,
  onUnpublish,
  onDelete,
  onPreview,
  onClearShare,
}: ServiceCatalogBuilderPanelProps) {
  const [draft, setDraft] = useState<ServiceCatalogDef | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('branding');

  const openNew = () => {
    setDraft(createBlankServiceCatalogDef());
    setEditorTab('import');
  };

  const openEdit = (c: ServiceCatalogDef) => {
    setDraft(JSON.parse(JSON.stringify(c)) as ServiceCatalogDef);
    setEditorTab('branding');
  };

  const closeEditor = () => {
    setDraft(null);
    onClearShare();
  };

  const patchConfig = (patch: Partial<CatalogConfig>) => {
    setDraft((d) => (d ? { ...d, catalogConfig: { ...d.catalogConfig, ...patch } } : d));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    setDraft((d) => {
      if (!d) return d;
      const arr = [...d.items];
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return d;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      return { ...d, items: arr };
    });
  };

  const updateItem = (idx: number, patch: Partial<ServiceCatalogItem>) => {
    setDraft((d) => {
      if (!d) return d;
      const arr = [...d.items];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, items: arr };
    });
  };

  const removeItem = (idx: number) => {
    setDraft((d) => {
      if (!d) return d;
      const arr = [...d.items];
      arr.splice(idx, 1);
      return { ...d, items: arr };
    });
  };

  const addItem = () => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        items: [
          ...d.items,
          {
            id: newServiceCatalogItemId(),
            name: 'New item',
            description: '',
            unitPrice: 0,
            currency: outputCurrency,
            active: true,
          },
        ],
      };
    });
  };

  const uploadConfigImage = async (
    field: 'logoImage' | 'coverImage' | 'backCoverImage',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await readFileAsDataUrl(file);
    const compressed = await compressCatalogImage(raw, field === 'logoImage' ? 600 : 1200, 0.78);
    patchConfig({ [field]: compressed });
    e.target.value = '';
  };

  const uploadItemImage = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await readFileAsDataUrl(file);
    const compressed = await compressCatalogImage(raw, 900, 0.75);
    updateItem(idx, { image: compressed });
    e.target.value = '';
  };

  const handleImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          const imported = parseServiceCatalogJson(parsed);
          if (!imported) {
            alert('Invalid catalog JSON — check name and items[]');
            return;
          }
          if (draft?.id) imported.id = draft.id;
          if (draft?.publishedKey) {
            imported.publishedKey = draft.publishedKey;
            imported.isPublished = draft.isPublished;
          }
          setDraft(imported);
          setEditorTab('branding');
        } catch {
          alert('Could not parse JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_SERVICE_CATALOG_JSON, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_service_catalog_v1.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDraftJson = () => {
    if (!draft) return;
    const data = {
      name: draft.name,
      description: draft.description,
      catalogConfig: draft.catalogConfig,
      items: draft.items,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(draft.name || 'catalog').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCatalogUrl = (c: ServiceCatalogDef) => {
    if (!c.publishedKey) return '';
    return `${window.location.origin}${window.location.pathname}?svc=${encodeURIComponent(c.publishedKey)}`;
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch {
      alert(text);
    }
  };

  const tabBtn = (id: EditorTab, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <button
      type="button"
      onClick={() => setEditorTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        editorTab === id
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  const listView = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Catalog Builder
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Build graphic multi-page catalogs from JSON — services or products. Publish online with inquiry cart
            (same engine as Catalog Gen).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-indigo-200 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            <Download className="w-4 h-4" /> Sample JSON
          </button>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> New catalog
          </button>
        </div>
      </div>

      {catalogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No catalogs yet</p>
          <p className="text-sm text-slate-500 mt-1">Import sample JSON or create a new catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catalogs.map((c) => {
            const url = getCatalogUrl(c);
            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="h-1.5"
                  style={{ background: `linear-gradient(90deg, ${c.catalogConfig.primaryColor || '#0f172a'}, #94a3b8)` }}
                />
                <div className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800">{c.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {c.catalogConfig.title || c.description || `${c.items.length} items`}
                      </p>
                    </div>
                    {c.isPublished ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Live
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {c.items.length} items · {c.catalogConfig.sections?.length || 0} sections ·{' '}
                    {c.catalogConfig.customPages?.length || 0} pages
                  </p>
                  {url ? (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-indigo-600 truncate">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{url}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    {url ? (
                      <>
                        <button
                          type="button"
                          onClick={() => copyText(c.shortUrl || url)}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                        >
                          Copy link
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this catalog?')) onDelete(c.id);
                      }}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!draft) return listView;

  const cc = draft.catalogConfig;
  const isPublishing = publishingId === draft.id || (!draft.id && publishingId === 'new');

  return (
    <div className="fixed inset-0 z-[75] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 truncate">{draft.id ? 'Edit catalog' : 'New catalog'}</h3>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 text-sm border border-slate-200 rounded-lg px-2 py-1 w-full max-w-md"
              placeholder="Internal catalog name"
            />
          </div>
          <button type="button" onClick={closeEditor} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-2">
          {tabBtn('import', 'JSON', Upload)}
          {tabBtn('branding', 'Cover & brand', Palette)}
          {tabBtn('items', `Items (${draft.items.length})`, Package)}
          {tabBtn('pages', 'Sections & pages', Layers)}
          {tabBtn('publish', 'Cart & publish', ShoppingCart)}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editorTab === 'import' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Import a JSON file using the sample schema. Keys: <code className="text-xs bg-slate-100 px-1 rounded">name</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">catalogConfig</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">items[]</code>, optional{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">sections</code> /{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">customPages</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleImportFile}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  <Upload className="w-4 h-4" /> Import JSON
                </button>
                <button
                  type="button"
                  onClick={downloadSample}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" /> Download sample
                </button>
                <button
                  type="button"
                  onClick={exportDraftJson}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" /> Export current
                </button>
              </div>
            </div>
          )}

          {editorTab === 'branding' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cover title</label>
                <input
                  type="text"
                  value={cc.title}
                  onChange={(e) => patchConfig({ title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Subtitle</label>
                <input
                  type="text"
                  value={cc.subtitle}
                  onChange={(e) => patchConfig({ subtitle: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Collection line</label>
                <input
                  type="text"
                  value={cc.collectionText || ''}
                  onChange={(e) => patchConfig({ collectionText: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Footer text</label>
                <input
                  type="text"
                  value={cc.footerText || ''}
                  onChange={(e) => patchConfig({ footerText: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Logo</label>
                <div className="flex gap-2 items-start">
                  {cc.logoImage ? (
                    <img src={cc.logoImage} alt="" className="h-12 max-w-[100px] object-contain border rounded bg-white p-1" />
                  ) : null}
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={cc.logoImage || ''}
                      onChange={(e) => patchConfig({ logoImage: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-[11px]"
                      placeholder="URL or upload"
                    />
                    <label className="inline-flex items-center gap-1 text-[10px] text-indigo-600 cursor-pointer">
                      <Upload className="w-3 h-3" /> Upload file
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadConfigImage('logoImage', e)} />
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cover image</label>
                <div className="space-y-1">
                  {cc.coverImage ? (
                    <img src={cc.coverImage} alt="" className="h-16 w-full max-w-xs object-cover rounded border" />
                  ) : null}
                  <input
                    type="text"
                    value={cc.coverImage || ''}
                    onChange={(e) => patchConfig({ coverImage: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-[11px]"
                  />
                  <label className="inline-flex items-center gap-1 text-[10px] text-indigo-600 cursor-pointer">
                    <Upload className="w-3 h-3" /> Upload file
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadConfigImage('coverImage', e)} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Primary color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={cc.primaryColor || '#0f172a'}
                    onChange={(e) => patchConfig({ primaryColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={cc.primaryColor || '#0f172a'}
                    onChange={(e) => patchConfig({ primaryColor: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cover color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={cc.coverColor || '#0f172a'}
                    onChange={(e) => patchConfig({ coverColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={cc.coverColor || '#0f172a'}
                    onChange={(e) => patchConfig({ coverColor: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm font-mono"
                  />
                </div>
              </div>
              <p className="md:col-span-2 text-[11px] text-slate-500">
                About us, content sections, and partner pages — edit in the <strong>Pages</strong> tab.
              </p>
            </div>
          )}

          {editorTab === 'items' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Each item becomes a catalog card with carousel, prices, and cart.</p>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  + Add item
                </button>
              </div>
              {draft.items.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center border border-dashed rounded-lg">No items — import JSON or add manually.</p>
              ) : (
                draft.items.map((it, idx) => (
                  <div key={it.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
                    <div className="flex gap-2 items-start">
                      <span className="text-[10px] font-bold text-slate-400 mt-2">#{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => updateItem(idx, { name: e.target.value })}
                          className="border border-slate-200 rounded px-2 py-1 text-sm font-medium"
                          placeholder="Name"
                        />
                        <input
                          type="text"
                          value={it.group || ''}
                          onChange={(e) => updateItem(idx, { group: e.target.value })}
                          className="border border-slate-200 rounded px-2 py-1 text-sm"
                          placeholder="Group / category"
                        />
                        <textarea
                          value={it.description || ''}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          className="md:col-span-2 border border-slate-200 rounded px-2 py-1 text-xs"
                          rows={2}
                          placeholder="Description"
                        />
                        <div className="md:col-span-2 flex flex-wrap gap-2 items-center">
                          {it.image ? (
                            <img src={it.image} alt="" className="h-10 w-10 object-cover rounded border shrink-0" />
                          ) : null}
                          <input
                            type="text"
                            value={it.image || ''}
                            onChange={(e) => updateItem(idx, { image: e.target.value })}
                            className="flex-1 min-w-[120px] border border-slate-200 rounded px-2 py-1 text-[11px] font-mono"
                            placeholder="Image URL"
                          />
                          <label className="text-[10px] px-2 py-1 border rounded bg-white cursor-pointer flex items-center gap-1 shrink-0">
                            <Upload className="w-3 h-3" /> Upload
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadItemImage(idx, e)} />
                          </label>
                        </div>
                        <input
                          type="number"
                          value={it.unitPrice ?? ''}
                          onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="border border-slate-200 rounded px-2 py-1 text-sm"
                          placeholder="Price"
                        />
                        <input
                          type="text"
                          value={it.currency || outputCurrency}
                          onChange={(e) => updateItem(idx, { currency: e.target.value })}
                          className="border border-slate-200 rounded px-2 py-1 text-sm"
                          placeholder="Currency"
                        />
                        <input
                          type="text"
                          value={it.moq || ''}
                          onChange={(e) => updateItem(idx, { moq: e.target.value })}
                          className="border border-slate-200 rounded px-2 py-1 text-sm"
                          placeholder="MOQ"
                        />
                        <input
                          type="text"
                          value={it.sku || ''}
                          onChange={(e) => updateItem(idx, { sku: e.target.value })}
                          className="border border-slate-200 rounded px-2 py-1 text-sm"
                          placeholder="SKU"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button type="button" disabled={idx === 0} onClick={() => moveItem(idx, -1)} className="p-1 border rounded disabled:opacity-30">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === draft.items.length - 1}
                          onClick={() => moveItem(idx, 1)}
                          className="p-1 border rounded disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => removeItem(idx)} className="p-1 border border-red-100 text-red-600 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {editorTab === 'pages' && <CatalogPagesVisualEditor config={cc} onChange={patchConfig} />}

          {editorTab === 'publish' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cc.cartEnabled !== false}
                  onChange={(e) => patchConfig({ cartEnabled: e.target.checked })}
                />
                Enable inquiry cart (online orders)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Order / inquiry email</label>
                  <input
                    type="email"
                    value={cc.orderEmail || ''}
                    onChange={(e) => patchConfig({ orderEmail: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact email (footer)</label>
                  <input
                    type="email"
                    value={cc.contactEmail || ''}
                    onChange={(e) => patchConfig({ contactEmail: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact phone</label>
                  <input
                    type="text"
                    value={cc.contactPhone || ''}
                    onChange={(e) => patchConfig({ contactPhone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Price terms (comma-separated)</label>
                  <input
                    type="text"
                    value={(cc.priceTerms || []).join(', ')}
                    onChange={(e) =>
                      patchConfig({
                        priceTerms: e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="FOB, CIF"
                  />
                </div>
              </div>
              {shareInfo && shareInfo.catalogId === (draft.id || 'draft') ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm space-y-2">
                  {shareInfo.uploading ? (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                    </p>
                  ) : shareInfo.error ? (
                    <p className="text-red-600">{shareInfo.error}</p>
                  ) : (
                    <>
                      <p className="font-medium text-emerald-800">Catalog is online</p>
                      {shareInfo.shortUrl ? (
                        <button type="button" onClick={() => copyText(shareInfo.shortUrl!)} className="text-xs text-indigo-600 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Short link
                        </button>
                      ) : null}
                      {shareInfo.qr ? <img src={shareInfo.qr} alt="QR" className="w-24 h-24 mx-auto" /> : null}
                    </>
                  )}
                </div>
              ) : null}
              <p className="text-[10px] text-slate-400">Save first, then publish. Inquiries appear in your main Inquiries inbox.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex flex-wrap gap-2 justify-end bg-slate-50">
          <button
            type="button"
            onClick={() => onPreview(draft)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white hover:bg-slate-50"
          >
            <Eye className="w-4 h-4" /> Preview HTML
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(draft)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          {draft.id && draft.isPublished ? (
            <button
              type="button"
              onClick={() => onUnpublish(draft.id)}
              className="px-3 py-2 text-sm border border-amber-200 text-amber-800 rounded-lg hover:bg-amber-50"
            >
              Unpublish
            </button>
          ) : null}
          <button
            type="button"
            disabled={isPublishing || saving}
            onClick={() => onPublish(draft)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Publish online
          </button>
        </div>
      </div>
    </div>
  );
}
