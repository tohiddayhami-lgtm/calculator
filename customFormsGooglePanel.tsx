import React from 'react';
import { Globe, Table2, ExternalLink } from 'lucide-react';
import type { CustomFormDef } from './types';
import { normalizeGoogleFormUrl, normalizeGoogleSheetsUrl } from './googleFormUtils';

export type CustomFormsInnerTab = 'list' | 'google-form' | 'google-sheets';

type Props = {
  tab: CustomFormsInnerTab;
  forms: CustomFormDef[];
  selectedFormId: string | null;
  onSelectFormId: (id: string | null) => void;
  onEditForm: (form: CustomFormDef) => void;
};

export function CustomFormsGoogleEmbedPanel({
  tab,
  forms,
  selectedFormId,
  onSelectFormId,
  onEditForm,
}: Props) {
  const isFormTab = tab === 'google-form';
  const selectedForm =
    forms.find((f) => f.id === selectedFormId) ||
    forms.find((f) => (f.googleFormUrl || '').trim() || (f.googleSheetsUrl || '').trim()) ||
    null;

  const link = isFormTab
    ? normalizeGoogleFormUrl(selectedForm?.googleFormUrl || '')
    : normalizeGoogleSheetsUrl(selectedForm?.googleSheetsUrl || '');
  const rawUrl = isFormTab ? selectedForm?.googleFormUrl || '' : selectedForm?.googleSheetsUrl || '';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isFormTab ? (
            <Globe className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <Table2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {isFormTab ? 'Google Form preview' : 'Google Sheets responses'}
            </p>
            <p className="text-[10px] text-slate-500 truncate max-w-md">
              {selectedForm?.name || 'Select a form'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedForm?.id || ''}
            onChange={(e) => onSelectFormId(e.target.value || null)}
            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white max-w-[220px]"
          >
            <option value="">— Select form —</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {link && (
            <a
              href={link.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-3 h-3" /> Open in Google
            </a>
          )}
        </div>
      </div>

      {!selectedForm ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          Create a form and add Google URLs in Edit → Google integration.
        </div>
      ) : !rawUrl.trim() ? (
        <div className="p-12 text-center text-slate-500 text-sm max-w-lg mx-auto">
          <p className="mb-2">
            No {isFormTab ? 'Google Form' : 'Google Sheets'} URL on this form yet.
          </p>
          <p className="text-[11px] text-slate-400 mb-3">
            Google Forms → Responses → Link to Sheets. Paste viewform and spreadsheet URLs in the editor.
          </p>
          <button
            type="button"
            onClick={() => onEditForm(selectedForm)}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit form & add links
          </button>
        </div>
      ) : !link ? (
        <div className="p-12 text-center text-amber-700 text-sm">
          URL format not recognized. Use a Google Form viewform or Sheets edit link.
          <p className="text-[10px] text-slate-500 mt-2 font-mono break-all px-4">{rawUrl}</p>
        </div>
      ) : (
        <div className="relative w-full bg-slate-50" style={{ height: 'min(72vh, 720px)' }}>
          <iframe
            title={isFormTab ? 'Google Form' : 'Google Sheets'}
            src={link.embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="fullscreen"
          />
        </div>
      )}

      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500">
        Download <strong>AI sample JSON</strong>, ask ChatGPT to fill <code>fields[]</code>, import here. Link Form to
        Sheets in Google to see responses in the Sheets tab.
      </div>
    </div>
  );
}

export function CustomFormsInnerTabs({
  active,
  onChange,
  hasGoogleLinked,
}: {
  active: CustomFormsInnerTab;
  onChange: (t: CustomFormsInnerTab) => void;
  hasGoogleLinked: boolean;
}) {
  const tabCls = (t: CustomFormsInnerTab) =>
    `px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
      active === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="flex flex-wrap gap-1.5 mb-4 p-1 bg-slate-100 rounded-xl w-fit">
      <button type="button" className={tabCls('list')} onClick={() => onChange('list')}>
        My forms
      </button>
      <button
        type="button"
        className={tabCls('google-form')}
        onClick={() => onChange('google-form')}
        title={hasGoogleLinked ? 'Preview linked Google Form' : 'Add a Google Form URL in form settings'}
      >
        <span className="inline-flex items-center gap-1">
          <Globe className="w-3 h-3" /> Google Form
        </span>
      </button>
      <button
        type="button"
        className={tabCls('google-sheets')}
        onClick={() => onChange('google-sheets')}
        title={hasGoogleLinked ? 'View responses spreadsheet' : 'Add Google Sheets URL in form settings'}
      >
        <span className="inline-flex items-center gap-1">
          <Table2 className="w-3 h-3" /> Google Sheets
        </span>
      </button>
    </div>
  );
}
