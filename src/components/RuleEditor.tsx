import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n';
import type { Bilingual } from '../data/types';
import {
  getAllCategoryDefs,
  mergeCategoryOverride,
  type CategoryDef,
  type RejectionCategory,
} from '../data/rejectionPatterns';
import { getBaseTemplate } from '../data/replyTemplates';
import {
  clearOverride,
  exportOverridesJson,
  importOverridesJson,
  loadOverrides,
  setOverride,
  type CustomOverride,
} from '../data/customRules';
import { copyToClipboard, downloadText } from '../lib/export';

interface Props {
  category: RejectionCategory;
  onClose: () => void;
  onChanged: () => void;
}

export default function RuleEditor({ category, onClose, onChanged }: Props) {
  const { t, tx } = useT();

  const baseDef = useMemo(
    () => getAllCategoryDefs().find((c) => c.id === category)!,
    [category],
  );
  const baseTpl = useMemo(() => getBaseTemplate(category), [category]);

  const [override, setOverrideState] = useState<CustomOverride>(
    () => loadOverrides()[category] ?? {},
  );

  // Merge base with override for the form starting point
  const merged = mergeCategoryOverride(baseDef, override);
  const tpl = {
    subject: override.replySubject ?? baseTpl.subject,
    body: override.replyBody ?? baseTpl.body,
  };

  const [summaryZh, setSummaryZh] = useState(merged.summary.zh);
  const [summaryEn, setSummaryEn] = useState(merged.summary.en);
  const [causesText, setCausesText] = useState(
    merged.causes.map((c) => `${c.zh}||${c.en}`).join('\n'),
  );
  const [stepsText, setStepsText] = useState(
    merged.nextSteps.map((s) => `${s.zh}||${s.en}`).join('\n'),
  );
  const [subjectZh, setSubjectZh] = useState(tpl.subject.zh);
  const [subjectEn, setSubjectEn] = useState(tpl.subject.en);
  const [bodyZh, setBodyZh] = useState(tpl.body.zh);
  const [bodyEn, setBodyEn] = useState(tpl.body.en);
  const [extraKwText, setExtraKwText] = useState((override.extraKeywords ?? []).join('\n'));
  const [resetVer, setResetVer] = useState(0); // used to force-refresh after reset

  // Keep inputs in sync when reset is triggered
  useEffect(() => {
    const current = loadOverrides()[category] ?? {};
    setOverrideState(current);
    const m = mergeCategoryOverride(baseDef, current);
    setSummaryZh(m.summary.zh);
    setSummaryEn(m.summary.en);
    setCausesText(m.causes.map((c) => `${c.zh}||${c.en}`).join('\n'));
    setStepsText(m.nextSteps.map((s) => `${s.zh}||${s.en}`).join('\n'));
    const tt = {
      subject: current.replySubject ?? baseTpl.subject,
      body: current.replyBody ?? baseTpl.body,
    };
    setSubjectZh(tt.subject.zh);
    setSubjectEn(tt.subject.en);
    setBodyZh(tt.body.zh);
    setBodyEn(tt.body.en);
    setExtraKwText((current.extraKeywords ?? []).join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetVer, category]);

  const parseBilingualLines = (text: string): Bilingual[] =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf('||');
        if (idx < 0) return { zh: line, en: line };
        return { zh: line.slice(0, idx).trim(), en: line.slice(idx + 2).trim() };
      });

  const handleSave = () => {
    const patch: CustomOverride = {
      summary: { zh: summaryZh, en: summaryEn },
      causes: parseBilingualLines(causesText),
      nextSteps: parseBilingualLines(stepsText),
      replySubject: { zh: subjectZh, en: subjectEn },
      replyBody: { zh: bodyZh, en: bodyEn },
      extraKeywords: extraKwText
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean),
    };
    setOverride(category, patch);
    onChanged();
    onClose();
  };

  const handleReset = () => {
    if (!confirm(t('editorResetConfirm'))) return;
    clearOverride(category);
    setResetVer((v) => v + 1);
    onChanged();
  };

  const hasOverride = Object.keys(override).length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-3 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-card-hover max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-amazon-orange uppercase tracking-wide">
              {t('editorTitle')}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-amazon-dark leading-snug mt-0.5 truncate">
              {tx(baseDef.title)}
            </h2>
            {hasOverride && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-amazon-warning">
                <span className="w-1.5 h-1.5 bg-amazon-warning rounded-full" />
                {t('editorSavedBadge')}
                {override.updatedAt && (
                  <span className="text-gray-400 font-mono">
                    · {t('editorUpdatedAt')} {override.updatedAt.slice(0, 10)}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-700 transition px-1"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <p className="text-[11px] text-gray-500 px-5 pt-3 leading-relaxed">{t('editorHint')}</p>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
          {/* Summary */}
          <FieldGroup label={t('editorFieldSummary')}>
            <div className="grid sm:grid-cols-2 gap-2">
              <BilingualTextarea
                label={t('editorSummaryZh')}
                value={summaryZh}
                onChange={setSummaryZh}
                rows={3}
              />
              <BilingualTextarea
                label={t('editorSummaryEn')}
                value={summaryEn}
                onChange={setSummaryEn}
                rows={3}
              />
            </div>
          </FieldGroup>

          {/* Causes */}
          <FieldGroup
            label={t('editorFieldCauses')}
            hint={'格式: 中文 || English · 每行一條'}
          >
            <textarea
              value={causesText}
              onChange={(e) => setCausesText(e.target.value)}
              rows={5}
              className={textareaClass}
            />
          </FieldGroup>

          {/* Next steps */}
          <FieldGroup
            label={t('editorFieldNextSteps')}
            hint={'格式: 中文 || English · 每行一條'}
          >
            <textarea
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              rows={6}
              className={textareaClass}
            />
          </FieldGroup>

          {/* Subject */}
          <FieldGroup label={t('editorFieldSubjectZh')}>
            <input
              value={subjectZh}
              onChange={(e) => setSubjectZh(e.target.value)}
              className={inputClass}
            />
          </FieldGroup>
          <FieldGroup label={t('editorFieldSubjectEn')}>
            <input
              value={subjectEn}
              onChange={(e) => setSubjectEn(e.target.value)}
              className={inputClass}
            />
          </FieldGroup>

          {/* Body */}
          <FieldGroup label={t('editorFieldBodyZh')}>
            <textarea
              value={bodyZh}
              onChange={(e) => setBodyZh(e.target.value)}
              rows={10}
              className={textareaClass}
            />
          </FieldGroup>
          <FieldGroup label={t('editorFieldBodyEn')}>
            <textarea
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              rows={10}
              className={textareaClass}
            />
          </FieldGroup>

          {/* Keywords */}
          <FieldGroup label={t('editorExtraKeywords')}>
            <textarea
              value={extraKwText}
              onChange={(e) => setExtraKwText(e.target.value)}
              rows={4}
              className={textareaClass}
              placeholder="e.g. bank reference letter&#10;holder name mismatch"
            />
          </FieldGroup>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleReset}
            disabled={!hasOverride}
            className="text-xs text-gray-500 hover:text-amazon-warning disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t('editorReset')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
            >
              {t('editorCancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-amazon-orange text-white hover:bg-amazon-orange-hover shadow-cta transition"
            >
              {t('editorSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small helper: import/export + clear-all toolbar, usable anywhere. */
export function CustomRulesToolbar({ onChanged }: { onChanged: () => void }) {
  const { t } = useT();
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (s: string) => {
    setMsg(s);
    setTimeout(() => setMsg(null), 2200);
  };

  const onExport = async () => {
    const json = exportOverridesJson();
    const ok = await copyToClipboard(json);
    downloadText(`pass-kyc-custom-${new Date().toISOString().slice(0, 10)}.json`, json);
    if (ok) flash(t('copied'));
  };

  const onImport = async () => {
    const text = prompt(t('editorImport') + ' (JSON)');
    if (!text) return;
    const { ok, error } = importOverridesJson(text);
    if (ok) {
      flash(t('editorImportOk'));
      onChanged();
    } else {
      flash(`${t('editorImportErr')}: ${error}`);
    }
  };

  const onClearAll = () => {
    if (!confirm(t('editorResetConfirm'))) return;
    localStorage.removeItem('pass-kyc-custom-rules-v1');
    onChanged();
    flash(t('editorReset'));
  };

  return (
    <div className="inline-flex items-center gap-1.5 text-[11px]">
      <button
        onClick={onExport}
        className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
      >
        ⬇ {t('editorExport')}
      </button>
      <button
        onClick={onImport}
        className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
      >
        ⬆ {t('editorImport')}
      </button>
      <button
        onClick={onClearAll}
        className="px-2 py-1 rounded border border-gray-200 text-gray-400 hover:text-amazon-warning hover:border-amazon-warning/30 transition"
      >
        {t('editorClearAll')}
      </button>
      {msg && <span className="ml-1.5 text-amazon-success">{msg}</span>}
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 flex flex-wrap items-center gap-2">
        <span>{label}</span>
        {hint && (
          <span className="text-[10px] text-gray-400 font-normal font-mono">{hint}</span>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function BilingualTextarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div>
      <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={textareaClass}
      />
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border-2 border-gray-200 focus:border-amazon-orange focus:ring-4 focus:ring-amazon-orange/10 px-3 py-2 text-sm outline-none transition';

const textareaClass =
  'w-full rounded-lg border-2 border-gray-200 focus:border-amazon-orange focus:ring-4 focus:ring-amazon-orange/10 px-3 py-2 text-sm leading-relaxed outline-none transition font-sans';
