import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Upload,
  Edit3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  FileText,
  LayoutGrid,
} from 'lucide-react';
import type { CatalogConfig, CatalogSection, CustomPage, CustomPageItem } from './types';
import { compressCatalogImage, compressImageFiles, readFileAsDataUrl } from './serviceCatalogImages';

function newSectionId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function newCustomPageId(): string {
  return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newCustomPageItemId(): string {
  return `cpi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

type Props = {
  config: CatalogConfig;
  onChange: (patch: Partial<CatalogConfig>) => void;
};

export function CatalogPagesVisualEditor({ config, onChange }: Props) {
  const [editingSection, setEditingSection] = useState<CatalogSection | null>(null);
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);

  const sections = config.sections || [];
  const customPages = config.customPages || [];

  const patch = onChange;

  const saveSections = (next: CatalogSection[]) => patch({ sections: next });
  const savePages = (next: CustomPage[]) => patch({ customPages: next });

  const addSection = () => {
    const s: CatalogSection = {
      id: newSectionId(),
      title: 'New section',
      content: '',
      alignment: 'left',
      position: 'before',
      images: [],
      imageLayout: 'grid',
    };
    saveSections([...sections, s]);
    setEditingSection(s);
  };

  const deleteSection = (id: number) => {
    if (!window.confirm('Delete this section?')) return;
    saveSections(sections.filter((s) => s.id !== id));
    if (editingSection?.id === id) setEditingSection(null);
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const arr = [...sections];
    const ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    saveSections(arr);
  };

  const commitSection = (updated: CatalogSection) => {
    saveSections(sections.map((s) => (s.id === updated.id ? updated : s)));
    setEditingSection(null);
  };

  const addCustomPage = () => {
    const p: CustomPage = {
      id: newCustomPageId(),
      title: 'New page',
      description: '',
      active: true,
      items: [],
    };
    savePages([...customPages, p]);
    setEditingPage(p);
  };

  const deleteCustomPage = (id: string) => {
    if (!window.confirm('Delete this page?')) return;
    savePages(customPages.filter((p) => p.id !== id));
    if (editingPage?.id === id) setEditingPage(null);
  };

  const moveCustomPage = (idx: number, dir: -1 | 1) => {
    const arr = [...customPages];
    const ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    savePages(arr);
  };

  const commitCustomPage = (updated: CustomPage) => {
    savePages(customPages.map((p) => (p.id === updated.id ? updated : p)));
    setEditingPage(null);
  };

  const handleSectionFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingSection || !e.target.files?.length) return;
    const added = await compressImageFiles(e.target.files, 800, 0.7);
    const existing = editingSection.images || (editingSection.image ? [editingSection.image] : []);
    setEditingSection({
      ...editingSection,
      images: [...existing, ...added],
      image: undefined,
    });
    e.target.value = '';
  };

  const removeSectionImage = (idx: number) => {
    if (!editingSection) return;
    const current = editingSection.images || (editingSection.image ? [editingSection.image] : []);
    setEditingSection({
      ...editingSection,
      images: current.filter((_, i) => i !== idx),
      image: undefined,
    });
  };

  const updatePageItem = (itemId: string | number, itemPatch: Partial<CustomPageItem>) => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      items: (editingPage.items || []).map((it) =>
        it.id === itemId ? { ...it, ...itemPatch } : it
      ),
    });
  };

  const addPageItem = () => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      items: [
        ...(editingPage.items || []),
        { id: newCustomPageItemId(), name: 'New item', description: '', active: true },
      ],
    });
  };

  const removePageItem = (itemId: string | number) => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      items: (editingPage.items || []).filter((it) => it.id !== itemId),
    });
  };

  const movePageItem = (idx: number, dir: -1 | 1) => {
    if (!editingPage?.items) return;
    const arr = [...editingPage.items];
    const ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    setEditingPage({ ...editingPage, items: arr });
  };

  const handlePageItemImage = async (itemId: string | number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await readFileAsDataUrl(file);
    const compressed = await compressCatalogImage(raw, 400, 0.8);
    updatePageItem(itemId, { image: compressed });
    e.target.value = '';
  };

  const handleAboutUsImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const added = await compressImageFiles(e.target.files, 900, 0.75);
    patch({ aboutUsImages: [...(config.aboutUsImages || []), ...added] });
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* About us */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          About us (full page before products)
        </h4>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!config.showAboutUs}
            onChange={(e) => patch({ showAboutUs: e.target.checked })}
          />
          Show about us page
        </label>
        {config.showAboutUs ? (
          <>
            <textarea
              value={config.aboutUsText || ''}
              onChange={(e) => patch({ aboutUsText: e.target.value })}
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Company story, trust message…"
            />
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Image layout</label>
              <select
                value={config.aboutUsImageLayout || 'side-right'}
                onChange={(e) =>
                  patch({ aboutUsImageLayout: e.target.value as CatalogConfig['aboutUsImageLayout'] })
                }
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
              >
                <option value="top">Images on top</option>
                <option value="bottom">Images below text</option>
                <option value="side-right">Text left, images right</option>
                <option value="side-left">Images left, text right</option>
                <option value="grid">Image grid</option>
              </select>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(config.aboutUsImages || []).map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        aboutUsImages: (config.aboutUsImages || []).filter((_, i) => i !== idx),
                      })
                    }
                    className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-white text-center p-2">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] text-slate-500 mt-1">Add photos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleAboutUsImages} />
              </label>
            </div>
          </>
        ) : null}
      </section>

      {/* Text + image sections */}
      <section className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-600" />
            Content sections
          </h4>
          <button
            type="button"
            onClick={addSection}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add section
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Rich text blocks with photos — placed before or after product cards in the published catalog.
        </p>
        {sections.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed rounded-lg">No sections yet.</p>
        ) : (
          <div className="space-y-2">
            {sections.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2.5 text-sm"
              >
                <span className="text-[10px] font-bold text-slate-400 w-5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{s.title}</div>
                  <div className="text-[10px] text-slate-500">
                    {s.position === 'before' ? 'Before products' : 'After products'} ·{' '}
                    {(s.images || (s.image ? [s.image] : [])).length} photo(s)
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" disabled={idx === 0} onClick={() => moveSection(idx, -1)} className="p-1 rounded border disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1}
                    onClick={() => moveSection(idx, 1)}
                    className="p-1 rounded border disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setEditingSection({ ...s })} className="p-1 rounded border text-slate-500 hover:text-indigo-600">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => deleteSection(s.id)} className="p-1 rounded border text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Custom pages (partners, certs) */}
      <section className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            Extra pages (partners, certificates…)
          </h4>
          <button
            type="button"
            onClick={addCustomPage}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add page
          </button>
        </div>
        <p className="text-[11px] text-slate-500">Each page is a full A4-style sheet with a grid of logo/card items.</p>
        {customPages.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed rounded-lg">No extra pages.</p>
        ) : (
          <div className="space-y-2">
            {customPages.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2.5 text-sm"
              >
                <span className="text-[10px] font-bold text-slate-400 w-5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{p.title}</div>
                  <div className="text-[10px] text-slate-500">
                    {(p.items || []).length} item(s) · {p.active === false ? 'Hidden' : 'Visible'}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" disabled={idx === 0} onClick={() => moveCustomPage(idx, -1)} className="p-1 rounded border disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === customPages.length - 1}
                    onClick={() => moveCustomPage(idx, 1)}
                    className="p-1 rounded border disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setEditingPage({ ...p })} className="p-1 rounded border text-slate-500 hover:text-indigo-600">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => deleteCustomPage(p.id)} className="p-1 rounded border text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section editor modal */}
      {editingSection ? (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Edit section</h3>
              <button type="button" onClick={() => setEditingSection(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Title</label>
                  <input
                    type="text"
                    value={editingSection.title}
                    onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Position</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditingSection({ ...editingSection, position: 'before' })}
                      className={`flex-1 py-1.5 text-xs font-medium rounded ${editingSection.position === 'before' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                    >
                      Before products
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSection({ ...editingSection, position: 'after' })}
                      className={`flex-1 py-1.5 text-xs font-medium rounded ${editingSection.position === 'after' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                    >
                      After products
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Alignment</label>
                <div className="flex gap-2">
                  {(
                    [
                      { id: 'left', icon: AlignLeft },
                      { id: 'center', icon: AlignCenter },
                      { id: 'right', icon: AlignRight },
                      { id: 'justify', icon: AlignJustify },
                    ] as const
                  ).map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEditingSection({ ...editingSection, alignment: id })}
                      className={`p-2 rounded border ${editingSection.alignment === id ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'border-slate-200 text-slate-400'}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Body text</label>
                <textarea
                  rows={6}
                  value={editingSection.content}
                  onChange={(e) => setEditingSection({ ...editingSection, content: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-y"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Photos</label>
                  <select
                    value={editingSection.imageLayout || 'grid'}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        imageLayout: e.target.value as CatalogSection['imageLayout'],
                      })
                    }
                    className="text-xs border border-slate-300 rounded px-2 py-1"
                  >
                    <option value="single">Single column</option>
                    <option value="two-column">2 columns</option>
                    <option value="three-column">3 columns</option>
                    <option value="grid">Grid</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(editingSection.images || (editingSection.image ? [editingSection.image] : [])).map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSectionImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-[10px] text-slate-500">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleSectionFiles} />
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setEditingSection(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => commitSection(editingSection)}
                className="px-5 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
              >
                Save section
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Custom page editor modal */}
      {editingPage ? (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Edit extra page</h3>
              <button type="button" onClick={() => setEditingPage(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Page title</label>
                  <input
                    type="text"
                    value={editingPage.title}
                    onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Introduction</label>
                  <textarea
                    rows={2}
                    value={editingPage.description || ''}
                    onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingPage.active !== false}
                    onChange={(e) => setEditingPage({ ...editingPage, active: e.target.checked })}
                  />
                  Show this page in catalog
                </label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Grid items</label>
                  <button type="button" onClick={addPageItem} className="text-xs text-indigo-600 font-medium">
                    + Add item
                  </button>
                </div>
                {(editingPage.items || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed rounded-lg">No items on this page.</p>
                ) : (
                  <div className="space-y-3">
                    {(editingPage.items || []).map((it, idx) => (
                      <div key={String(it.id)} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
                        <div className="flex gap-2">
                          <div className="w-14 h-14 rounded-lg border bg-white overflow-hidden shrink-0 flex items-center justify-center">
                            {it.image ? (
                              <img src={it.image} alt="" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 grid grid-cols-1 gap-1.5 min-w-0">
                            <input
                              type="text"
                              value={it.name}
                              onChange={(e) => updatePageItem(it.id, { name: e.target.value })}
                              className="border border-slate-200 rounded px-2 py-1 text-sm font-medium"
                              placeholder="Name"
                            />
                            <input
                              type="text"
                              value={it.description || ''}
                              onChange={(e) => updatePageItem(it.id, { description: e.target.value })}
                              className="border border-slate-200 rounded px-2 py-1 text-xs"
                              placeholder="Short description"
                            />
                            <div className="flex gap-2 flex-wrap">
                              <input
                                type="text"
                                value={typeof it.image === 'string' && !it.image.startsWith('data:') ? it.image : ''}
                                onChange={(e) => updatePageItem(it.id, { image: e.target.value })}
                                className="flex-1 min-w-[120px] border border-slate-200 rounded px-2 py-1 text-[10px] font-mono"
                                placeholder="Image URL"
                              />
                              <label className="text-[10px] px-2 py-1 border border-slate-200 rounded bg-white cursor-pointer hover:bg-slate-50 flex items-center gap-1">
                                <Upload className="w-3 h-3" /> Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePageItemImage(it.id, e)}
                                />
                              </label>
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <button type="button" disabled={idx === 0} onClick={() => movePageItem(idx, -1)} className="p-1 border rounded disabled:opacity-30">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === (editingPage.items?.length || 0) - 1}
                              onClick={() => movePageItem(idx, 1)}
                              className="p-1 border rounded disabled:opacity-30"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => removePageItem(it.id)} className="p-1 border border-red-100 text-red-600 rounded">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setEditingPage(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => commitCustomPage(editingPage)}
                className="px-5 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
              >
                Save page
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
