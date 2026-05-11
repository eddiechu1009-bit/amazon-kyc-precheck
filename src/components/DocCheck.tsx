import { useCallback, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import { extractPdfText, rasterizePdfPages } from '../lib/pdf';
import { ocrImage, type OcrProgress } from '../lib/ocr';
import {
  crossCheck,
  docTypeById,
  docTypes,
  verifyAgainstOcr,
  type CrossDocFinding,
  type DocType,
  type FieldSpec,
  type VerifyFinding,
  type VerifyReport,
} from '../lib/verifyFields';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

type DocStatus = 'idle' | 'reading' | 'ocr' | 'done' | 'error';

interface DocEntry {
  id: string;
  docType: DocType;
  /** Seller-provided field values, keyed by FieldSpec.id */
  values: Record<string, string>;
  file?: File;
  status: DocStatus;
  progress?: number;
  progressLabel?: string;
  rawText?: string;
  report?: VerifyReport;
  usedOcr?: boolean;
  errorMessage?: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const newDoc = (docType: DocType): DocEntry => ({
  id: uid(),
  docType,
  values: {},
  status: 'idle',
});

export default function DocCheck() {
  const { t, lang } = useT();
  const [docs, setDocs] = useState<DocEntry[]>([]);

  const readyDocs = useMemo(() => docs.filter((d) => d.status === 'done'), [docs]);

  const crossFindings = useMemo<CrossDocFinding[]>(
    () =>
      readyDocs.length >= 2
        ? crossCheck(readyDocs.map((d) => ({ docType: d.docType, values: d.values })))
        : [],
    [readyDocs],
  );

  const updateDoc = (id: string, patch: Partial<DocEntry>) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const setField = (id: string, fieldId: string, value: string) => {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const nextValues = { ...d.values, [fieldId]: value };
        // Re-run verification on the fly if OCR is already done
        const nextReport = d.rawText
          ? verifyAgainstOcr(d.docType, nextValues, d.rawText)
          : undefined;
        return { ...d, values: nextValues, report: nextReport };
      }),
    );
  };

  const removeDoc = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));
  const clearAll = () => setDocs([]);

  const addDoc = (docType: DocType) => {
    setDocs((prev) => [...prev, newDoc(docType)]);
  };

  async function runOcrFor(entry: DocEntry, file: File) {
    updateDoc(entry.id, { file, status: 'reading', progress: 0, progressLabel: 'reading' });
    try {
      let rawText = '';
      let usedOcr = false;
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';

      if (isPdf) {
        const pdf = await extractPdfText(file);
        rawText = pdf.fullText;
        if (pdf.probablyScanned) {
          updateDoc(entry.id, { status: 'ocr', progress: 0, progressLabel: 'rasterize' });
          const pages = await rasterizePdfPages(file, {
            scale: 2.0,
            maxPages: 3,
            onProgress: ({ page, total }) => {
              updateDoc(entry.id, {
                progress: (page / total) * 0.3,
                progressLabel: `rasterizing ${page}/${total}`,
              });
            },
          });
          usedOcr = true;
          const pageTexts: string[] = [];
          for (let i = 0; i < pages.length; i++) {
            const res = await ocrImage(pages[i], (p: OcrProgress) => {
              const base = 0.3 + (i / pages.length) * 0.7;
              const share = (1 / pages.length) * 0.7;
              updateDoc(entry.id, {
                progress: base + p.progress * share,
                progressLabel: `${p.status} (${i + 1}/${pages.length})`,
              });
            });
            pageTexts.push(res.text);
          }
          rawText = pageTexts.join('\n\n');
        }
      } else {
        usedOcr = true;
        updateDoc(entry.id, { status: 'ocr', progress: 0, progressLabel: 'OCR' });
        const res = await ocrImage(file, (p: OcrProgress) => {
          updateDoc(entry.id, { progress: p.progress, progressLabel: p.status });
        });
        rawText = res.text;
      }

      // Pull latest values from state to verify against
      setDocs((prev) => {
        return prev.map((d) => {
          if (d.id !== entry.id) return d;
          const report = verifyAgainstOcr(d.docType, d.values, rawText);
          return { ...d, rawText, report, usedOcr, status: 'done', progress: 1 };
        });
      });
    } catch (err: any) {
      console.error(err);
      updateDoc(entry.id, { status: 'error', errorMessage: err?.message ?? 'unknown error' });
    }
  }

  const onFile = useCallback(
    async (entryId: string, files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr[0]) return;
      const file = arr[0];
      if (file.size > MAX_FILE_SIZE) return;
      const entry = docs.find((d) => d.id === entryId);
      if (!entry) return;
      await runOcrFor(entry, file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docs],
  );

  // Empty state: doc-type picker
  if (docs.length === 0) {
    return <TypePicker onPick={(t) => addDoc(t)} />;
  }

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn pb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-amazon-dark">
          {lang === 'zh' ? '📄 文件自檢' : '📄 Document check'}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-amazon-warning transition"
          >
            {t('docCheckStartFresh')}
          </button>
        </div>
      </div>

      {crossFindings.length > 0 && (
        <section className="mb-4 bg-white rounded-2xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span>🔗</span>
            <h3 className="text-base font-semibold text-amazon-dark">
              {t('docCheckCrossCheck')}
            </h3>
          </div>
          <ul className="space-y-2">
            {crossFindings.map((f, i) => (
              <FindingRow
                key={i}
                level={f.level as any}
                title={t(f.titleKey as any)}
                detail={f.detail}
              />
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-4">
        {docs.map((doc, i) => (
          <DocCard
            key={doc.id}
            doc={doc}
            index={i}
            onFieldChange={(fieldId, value) => setField(doc.id, fieldId, value)}
            onFile={(files) => onFile(doc.id, files)}
            onRemove={() => removeDoc(doc.id)}
          />
        ))}
      </div>

      <div className="mt-5">
        <AddAnother onPick={(t) => addDoc(t)} />
      </div>
    </div>
  );
}

// ======================================================================
// Sub-components
// ======================================================================

function TypePicker({ onPick }: { onPick: (t: DocType) => void }) {
  const { t, tx } = useT();
  return (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-7">
        <h2 className="text-lg sm:text-xl font-bold text-amazon-dark leading-snug">
          {t('docCheckChooseType')}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
          {t('docCheckChooseTypeDesc')}
        </p>

        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          {docTypes.map((dt) => (
            <button
              key={dt.id}
              onClick={() => onPick(dt.id)}
              className="text-left bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4
                hover:border-amazon-orange hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{dt.icon}</div>
                <div className="min-w-0">
                  <div className="font-semibold text-amazon-dark text-sm">
                    {tx({ zh: dt.titleZh, en: dt.titleEn })}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    {tx({ zh: dt.descZh, en: dt.descEn })}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-amazon-success bg-amazon-success/10 border border-amazon-success/20 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 bg-amazon-success rounded-full animate-pulse" />
          <span>{t('privacyBadge')}</span>
        </div>
      </div>
    </div>
  );
}

function AddAnother({ onPick }: { onPick: (t: DocType) => void }) {
  const { t, tx } = useT();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm rounded-xl border border-dashed border-gray-300 text-gray-600
          py-3 hover:border-amazon-orange hover:text-amazon-orange transition"
      >
        + {t('docCheckAddMoreDoc')}
      </button>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 animate-fadeIn">
      <div className="grid sm:grid-cols-2 gap-2">
        {docTypes.map((dt) => (
          <button
            key={dt.id}
            onClick={() => {
              onPick(dt.id);
              setOpen(false);
            }}
            className="text-left flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition"
          >
            <span className="text-xl">{dt.icon}</span>
            <span className="text-xs font-medium text-gray-700">
              {tx({ zh: dt.titleZh, en: dt.titleEn })}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setOpen(false)}
        className="mt-1 w-full text-[11px] text-gray-400 hover:text-gray-600"
      >
        ×
      </button>
    </div>
  );
}

function DocCard({
  doc,
  index,
  onFieldChange,
  onFile,
  onRemove,
}: {
  doc: DocEntry;
  index: number;
  onFieldChange: (fieldId: string, value: string) => void;
  onFile: (files: FileList | File[]) => void;
  onRemove: () => void;
}) {
  const { t, tx, lang } = useT();
  const [dragOver, setDragOver] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const def = docTypeById.get(doc.docType)!;
  const isProcessing = doc.status === 'reading' || doc.status === 'ocr';

  const requiredFilled = def.fields
    .filter((f) => f.required)
    .every((f) => (doc.values[f.id] ?? '').trim().length > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 sm:p-5 border-b border-gray-100">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amazon-blue/10 text-amazon-blue flex items-center justify-center text-lg">
          {def.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {t('docCheckDocType')} #{index + 1}
          </div>
          <div className="font-semibold text-amazon-dark">
            {tx({ zh: def.titleZh, en: def.titleEn })}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {tx({ zh: def.descZh, en: def.descEn })}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-amazon-warning text-xl leading-none px-1"
          aria-label="remove"
        >
          ×
        </button>
      </div>

      {/* Fields */}
      <div className="p-4 sm:p-5">
        <div className="mb-3">
          <div className="text-sm font-semibold text-amazon-dark">
            {t('docCheckFillFields')}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
            {t('docCheckFillHint')}
          </p>
        </div>

        <div className="space-y-3">
          {def.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={doc.values[field.id] ?? ''}
              onChange={(v) => onFieldChange(field.id, v)}
              finding={
                doc.report?.fields.find((fr) => fr.fieldId === field.id)?.findings[
                  doc.report?.fields.find((fr) => fr.fieldId === field.id)?.findings.length! - 1
                ]
              }
            />
          ))}
        </div>
      </div>

      {/* File upload / progress */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        {!doc.file && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) onFile(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all duration-200 ${
              !requiredFilled
                ? 'border-gray-200 bg-gray-50 text-gray-400'
                : dragOver
                ? 'border-amazon-orange bg-orange-50 scale-[1.005]'
                : 'border-amazon-orange/40 bg-orange-50/30 hover:border-amazon-orange hover:bg-orange-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onFile(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="text-2xl mb-1">⬆</div>
            <div className="text-sm font-semibold">
              {requiredFilled
                ? t('docCheckAddDoc')
                : lang === 'zh'
                ? '請先填必填欄位再上傳'
                : 'Fill required fields first'}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">{t('docCheckDropHint')}</div>
          </div>
        )}

        {doc.file && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs flex items-center gap-2">
            <span className="text-lg">{/^image\//.test(doc.file.type) ? '🖼️' : '📄'}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 truncate">{doc.file.name}</div>
              <div className="text-[10px] text-gray-400">{(doc.file.size / 1024).toFixed(0)} KB</div>
            </div>
            {doc.usedOcr && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-amber-700 border-amber-200 bg-amber-50">
                OCR
              </span>
            )}
            <button
              onClick={() => inputRef.current?.click()}
              className="text-[11px] text-amazon-orange hover:underline"
            >
              {t('docCheckReplaceFile')}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onFile(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {isProcessing && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
              <span className="truncate pr-2">
                {doc.progressLabel ?? t('docCheckProcessing')}
              </span>
              {doc.progress !== undefined && (
                <span className="font-mono">{Math.round(doc.progress * 100)}%</span>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 bg-gradient-to-r from-amazon-orange to-yellow-400 transition-all duration-300"
                style={{ width: `${Math.max(8, (doc.progress ?? 0) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {doc.status === 'error' && (
          <div className="mt-3 text-xs text-amazon-danger bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
            {t('docCheckError')}
            {doc.errorMessage && <span className="text-gray-500"> — {doc.errorMessage}</span>}
          </div>
        )}
      </div>

      {/* Report summary */}
      {doc.status === 'done' && doc.report && (
        <>
          <div className="px-4 sm:px-5 py-3 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700">
                {t('docCheckScorePct')}: {doc.report.scorePct}%
              </span>
              <div className="flex items-center gap-2">
                <Chip level="ok" count={doc.report.okCount} />
                <Chip level="warn" count={doc.report.warnCount} />
                <Chip level="fail" count={doc.report.failCount} />
              </div>
            </div>
            <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 bg-gradient-to-r from-amazon-success to-green-400 transition-all duration-500"
                style={{ width: `${doc.report.scorePct}%` }}
              />
            </div>
          </div>

          {doc.usedOcr && doc.rawText && (
            <div className="px-4 sm:px-5 pb-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-900 leading-relaxed">
                ⚠️ {t('docCheckOcrUncertain')}
              </div>
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="mt-2 text-[11px] text-amazon-orange hover:underline inline-flex items-center gap-1"
              >
                <span>{showRaw ? t('docCheckHideRawOcr') : t('docCheckShowRawOcr')}</span>
                <span className={`transition-transform ${showRaw ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showRaw && (
                <pre className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto scrollbar-thin font-mono leading-relaxed">
{doc.rawText}
                </pre>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  finding,
}: {
  field: FieldSpec;
  value: string;
  onChange: (v: string) => void;
  finding: VerifyFinding | undefined;
}) {
  const { t, lang } = useT();
  const label = lang === 'zh' ? field.labelZh : field.labelEn;
  const hint = lang === 'zh' ? field.hintZh : field.hintEn;
  const placeholder = lang === 'zh' ? field.placeholderZh : field.placeholderEn;

  const borderByLevel = !finding
    ? 'border-gray-200 focus:border-amazon-orange'
    : finding.level === 'ok'
    ? 'border-emerald-300 focus:border-emerald-400'
    : finding.level === 'warn'
    ? 'border-amber-300 focus:border-amber-400'
    : finding.level === 'fail'
    ? 'border-red-300 focus:border-red-400'
    : 'border-gray-200';

  const isLongField = field.kind === 'address';

  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
        <span>{label}</span>
        {field.required && <span className="text-[10px] text-red-500">*</span>}
      </label>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{hint}</p>}
      {isLongField ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`mt-1.5 w-full rounded-lg border-2 ${borderByLevel} px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-amazon-orange/10`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`mt-1.5 w-full rounded-lg border-2 ${borderByLevel} px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-amazon-orange/10`}
        />
      )}
      {finding && finding.level !== 'skipped' && (
        <InlineFinding finding={finding} fallbackT={t} />
      )}
    </div>
  );
}

function InlineFinding({
  finding,
  fallbackT,
}: {
  finding: VerifyFinding;
  fallbackT: (k: any) => string;
}) {
  const style = {
    ok: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    warn: 'text-amber-800 bg-amber-50 border-amber-200',
    fail: 'text-red-700 bg-red-50 border-red-200',
    skipped: 'text-gray-500 bg-gray-50 border-gray-200',
  }[finding.level];
  const icon = { ok: '✅', warn: '⚠️', fail: '❌', skipped: '—' }[finding.level];
  return (
    <div className={`mt-1.5 rounded-md border px-2.5 py-1.5 text-[11px] leading-relaxed ${style}`}>
      <div className="flex items-start gap-1.5">
        <span className="leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <div>{fallbackT(finding.titleKey as any)}</div>
          {finding.detail && <div className="text-gray-600 mt-0.5 font-mono text-[10px]">{finding.detail}</div>}
          {finding.nearMatch && (
            <div className="text-gray-700 mt-0.5 font-mono text-[10px]">
              ≈ <span className="bg-white px-1 rounded">{finding.nearMatch}</span>
            </div>
          )}
          {finding.snippet && (
            <div className="text-gray-500 mt-0.5 text-[10px] italic truncate">{finding.snippet}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ level, count }: { level: 'ok' | 'warn' | 'fail'; count: number }) {
  if (count === 0) return null;
  const style = {
    ok: 'bg-emerald-100 text-emerald-700',
    warn: 'bg-amber-100 text-amber-800',
    fail: 'bg-red-100 text-red-700',
  }[level];
  const icon = { ok: '✓', warn: '⚠', fail: '✗' }[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono ${style}`}>
      {icon} {count}
    </span>
  );
}

function FindingRow({
  level,
  title,
  detail,
}: {
  level: 'ok' | 'warn' | 'fail';
  title: string;
  detail?: string;
}) {
  const style = {
    ok: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '✅' },
    warn: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '⚠️' },
    fail: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '❌' },
  }[level];
  return (
    <li className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2 text-xs`}>
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 leading-none">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${style.text}`}>{title}</div>
          {detail && <div className="text-gray-600 mt-0.5 break-all">{detail}</div>}
        </div>
      </div>
    </li>
  );
}
