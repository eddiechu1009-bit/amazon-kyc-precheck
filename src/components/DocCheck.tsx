import { useCallback, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import { extractPdfText, rasterizePdfPages } from '../lib/pdf';
import { ocrImage, type OcrProgress } from '../lib/ocr';
import {
  buildFindings,
  crossCheck,
  extractFields,
  guessDocType,
  type DocType,
  type ExtractedFields,
  type FindingItem,
} from '../lib/fieldExtract';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

type DocStatus = 'queued' | 'reading' | 'ocr' | 'done' | 'error';

interface DocEntry {
  id: string;
  file: File;
  status: DocStatus;
  progress?: number;
  progressLabel?: string;
  rawText?: string;
  docType?: DocType;
  fields?: ExtractedFields;
  findings?: FindingItem[];
  errorMessage?: string;
  usedOcr?: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 9);

export default function DocCheck() {
  const { t, lang } = useT();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readyDocs = useMemo(
    () => docs.filter((d) => d.status === 'done' && d.fields),
    [docs],
  );
  const crossFindings = useMemo(
    () =>
      readyDocs.length >= 2
        ? crossCheck(readyDocs.map((d) => ({ docType: d.docType ?? 'unknown', fields: d.fields! })))
        : [],
    [readyDocs],
  );

  const onFiles = useCallback(async (files: FileList | File[]) => {
    const incoming: DocEntry[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_SIZE) continue;
      incoming.push({ id: uid(), file: f, status: 'queued' });
    }
    if (incoming.length === 0) return;
    setDocs((prev) => [...prev, ...incoming]);
    for (const d of incoming) {
      processOne(d.id, d.file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDoc = (id: string, patch: Partial<DocEntry>) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  async function processOne(id: string, file: File) {
    try {
      updateDoc(id, { status: 'reading', progress: 0, progressLabel: 'reading' });

      let rawText = '';
      let usedOcr = false;
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';

      if (isPdf) {
        const pdf = await extractPdfText(file);
        rawText = pdf.fullText;
        if (pdf.probablyScanned) {
          // OCR fallback: rasterize → tesseract
          updateDoc(id, { status: 'ocr', progress: 0, progressLabel: 'rasterize' });
          const pages = await rasterizePdfPages(file, {
            scale: 2.0,
            maxPages: 3,
            onProgress: ({ page, total }) => {
              updateDoc(id, {
                progress: (page / total) * 0.3, // 0..30%
                progressLabel: `rasterizing ${page}/${total}`,
              });
            },
          });
          usedOcr = true;
          const pageTexts: string[] = [];
          for (let i = 0; i < pages.length; i++) {
            const result = await ocrImage(pages[i], (p: OcrProgress) => {
              const base = 0.3 + (i / pages.length) * 0.7;
              const share = (1 / pages.length) * 0.7;
              updateDoc(id, {
                progress: base + p.progress * share,
                progressLabel: `${p.status} (${i + 1}/${pages.length})`,
              });
            });
            pageTexts.push(result.text);
          }
          rawText = pageTexts.join('\n\n');
        }
      } else {
        // Image → OCR directly
        usedOcr = true;
        updateDoc(id, { status: 'ocr', progress: 0, progressLabel: 'OCR' });
        const result = await ocrImage(file, (p: OcrProgress) => {
          updateDoc(id, { progress: p.progress, progressLabel: p.status });
        });
        rawText = result.text;
      }

      const docType = guessDocType(rawText);
      const fields = extractFields(rawText);
      const findings = buildFindings(docType, fields, rawText);
      updateDoc(id, {
        status: 'done',
        rawText,
        docType,
        fields,
        findings,
        usedOcr,
      });
    } catch (err: any) {
      console.error(err);
      updateDoc(id, {
        status: 'error',
        errorMessage: err?.message ?? 'unknown error',
      });
    }
  }

  /** Override the holder or address after OCR; re-run findings. */
  const overrideField = (
    id: string,
    patch: { accountHolder?: string; bestAddress?: string },
  ) => {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== id || !d.fields) return d;
        const nextFields: ExtractedFields = { ...d.fields, ...patch };
        const nextFindings = buildFindings(
          d.docType ?? 'unknown',
          nextFields,
          d.rawText ?? '',
        );
        return { ...d, fields: nextFields, findings: nextFindings };
      }),
    );
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };
  const clearAll = () => setDocs([]);

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn pb-8">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) onFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative bg-white rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer
          transition-all duration-200 ${
            dragOver
              ? 'border-amazon-orange bg-orange-50 scale-[1.01]'
              : 'border-gray-200 hover:border-amazon-orange/60 hover:bg-orange-50/30'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="text-3xl mb-2 animate-float">📄</div>
        <div className="text-base sm:text-lg font-semibold text-amazon-dark">
          {t('docCheckTitle')}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed max-w-md mx-auto">
          {t('docCheckDesc')}
        </p>
        <div className="mt-5 inline-flex flex-col items-center gap-1">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-amazon-orange">
            <span>⬆</span>
            <span>{t('docCheckDropZone')}</span>
          </div>
          <div className="text-[11px] text-gray-400">{t('docCheckDropHint')}</div>
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-amazon-success bg-amazon-success/10 border border-amazon-success/20 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 bg-amazon-success rounded-full animate-pulse" />
          <span>{t('privacyBadge')}</span>
        </div>
      </div>

      {docs.length > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {readyDocs.length} / {docs.length} — {lang === 'zh' ? '分析完成' : 'analyzed'}
          </div>
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-amazon-warning transition"
          >
            {t('docCheckClearAll')}
          </button>
        </div>
      )}

      {crossFindings.length > 0 && (
        <section className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span>🔗</span>
            <h3 className="text-base font-semibold text-amazon-dark">
              {t('docCheckCrossCheck')}
            </h3>
          </div>
          <ul className="space-y-2">
            {crossFindings.map((f, i) => (
              <FindingRow key={i} level={f.level} title={t(f.titleKey as any)} detail={f.detail} />
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 space-y-3">
        {docs.map((doc) => (
          <DocCard
            key={doc.id}
            doc={doc}
            onRemove={() => removeDoc(doc.id)}
            onOverride={(patch) => overrideField(doc.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function DocCard({
  doc,
  onRemove,
  onOverride,
}: {
  doc: DocEntry;
  onRemove: () => void;
  onOverride: (patch: { accountHolder?: string; bestAddress?: string }) => void;
}) {
  const { t, lang } = useT();
  const [expanded, setExpanded] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const typeLabel = {
    bank_statement: t('docTypeBank'),
    company_registration: t('docTypeCompany'),
    proof_of_address: t('docTypePoa'),
    id: t('docTypeId'),
    unknown: t('docTypeUnknown'),
  }[doc.docType ?? 'unknown'];

  const isImage = /^image\//.test(doc.file.type);

  // Candidates that are NOT currently the selected holder / address
  const otherNames = useMemo(() => {
    if (!doc.fields) return [];
    const current = doc.fields.accountHolder ?? '';
    return doc.fields.nameCandidates.filter(
      (n) => n.value.toUpperCase() !== current.toUpperCase(),
    );
  }, [doc.fields]);

  const otherAddresses = useMemo(() => {
    if (!doc.fields) return [];
    const current = doc.fields.bestAddress ?? '';
    return doc.fields.addressCandidates.filter((a) => a.value !== current);
  }, [doc.fields]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
            doc.status === 'done'
              ? 'bg-amazon-success/10 text-amazon-success'
              : doc.status === 'error'
              ? 'bg-amazon-danger/10 text-amazon-danger'
              : 'bg-amazon-blue/10 text-amazon-blue'
          }`}
        >
          {isImage ? '🖼️' : '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2">
            <div className="font-semibold text-sm text-amazon-dark truncate" title={doc.file.name}>
              {doc.file.name}
            </div>
            {doc.status === 'done' && doc.docType && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  doc.docType === 'unknown'
                    ? 'text-gray-500 border-gray-200 bg-gray-50'
                    : 'text-amazon-blue border-amazon-blue/30 bg-amazon-blue/5'
                }`}
              >
                {typeLabel}
              </span>
            )}
            {doc.usedOcr && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-amber-700 border-amber-200 bg-amber-50">
                OCR
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {(doc.file.size / 1024).toFixed(0)} KB
          </div>

          {(doc.status === 'reading' || doc.status === 'ocr') && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                <span className="truncate pr-2">
                  {doc.progressLabel ?? t('docCheckProcessing')}
                </span>
                {doc.progress !== undefined && (
                  <span className="font-mono flex-shrink-0">{Math.round(doc.progress * 100)}%</span>
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
            <div className="mt-2 text-xs text-amazon-danger bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
              {t('docCheckError')}
              {doc.errorMessage && <span className="text-gray-500"> — {doc.errorMessage}</span>}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-amazon-warning transition text-lg leading-none px-1"
          aria-label="remove"
        >
          ×
        </button>
      </div>

      {/* Body */}
      {doc.status === 'done' && doc.fields && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 text-[11px] text-amazon-orange font-medium border-t border-gray-100 hover:bg-orange-50/50 transition inline-flex items-center justify-center gap-1"
          >
            <span>
              {expanded
                ? lang === 'zh' ? '收合細節' : 'Collapse details'
                : lang === 'zh' ? '展開辨識內容與檢查結果' : 'Show extracted fields & findings'}
            </span>
            <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {expanded && (
            <div className="px-4 pb-4 pt-0 animate-slideDown border-t border-gray-100">
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                {/* Extracted */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {t('docCheckExtracted')}
                  </div>
                  <dl className="text-xs space-y-1.5 text-gray-700">
                    <Field label={t('docFieldHolder')} value={doc.fields.accountHolder} />
                    <Field label={t('docFieldIban')} value={doc.fields.iban} mono />
                    <Field label={t('docFieldBic')} value={doc.fields.bic} mono />
                    <Field label={t('docFieldAccountNumber')} value={doc.fields.accountNumber} mono />
                    <Field label={t('docFieldTaxId')} value={doc.fields.taiwanTaxId} mono />
                    <Field label={t('docFieldDate')} value={doc.fields.issueDate} mono />
                    <Field label={t('docFieldAddress')} value={doc.fields.bestAddress} multiline />
                  </dl>
                </div>
                {/* Findings */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {t('docCheckFindings')}
                  </div>
                  <ul className="space-y-2">
                    {(doc.findings ?? []).map((f, i) => (
                      <FindingRow
                        key={i}
                        level={f.level}
                        title={t(f.titleKey as any)}
                        detail={f.detail}
                      />
                    ))}
                  </ul>
                </div>
              </div>

              {/* Candidate override: names */}
              {otherNames.length > 0 && (
                <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {t('docCandidatesTitle')}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    {t('docCandidatesHint')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {otherNames.map((n) => (
                      <button
                        key={n.value}
                        onClick={() => onOverride({ accountHolder: n.value })}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition inline-flex items-center gap-1.5
                          ${
                            n.likelyBank
                              ? 'bg-gray-50 border-gray-200 text-gray-500 hover:border-amazon-orange/50'
                              : 'bg-white border-gray-300 text-gray-800 hover:border-amazon-orange hover:bg-orange-50'
                          }`}
                        title={n.likelyBank ? 'Detected as a bank name' : ''}
                      >
                        <span>{n.value}</span>
                        {n.likelyBank && (
                          <span className="text-[9px] uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded px-1 py-0">
                            {t('docCandidateBankHint')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidate override: addresses */}
              {otherAddresses.length > 0 && (
                <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {t('docCandidateAddressTitle')}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    {t('docCandidateAddressHint')}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {otherAddresses.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => onOverride({ bestAddress: a.value })}
                        className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg border transition
                          ${
                            a.likelyBankAddress
                              ? 'bg-gray-50 border-gray-200 text-gray-500 hover:border-amazon-orange/50'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-amazon-orange hover:bg-orange-50'
                          }`}
                      >
                        <span>{a.value}</span>
                        {a.likelyBankAddress && (
                          <span className="ml-1.5 text-[9px] uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded px-1 py-0">
                            {t('docCandidateBankHint')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw OCR text (for transparency) */}
              {doc.usedOcr && doc.rawText && (
                <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[11px] text-amazon-orange hover:underline inline-flex items-center gap-1"
                  >
                    <span>{showRaw ? t('docHideRawOcr') : t('docShowRawOcr')}</span>
                    <span className={`transition-transform ${showRaw ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {showRaw && (
                    <pre className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto scrollbar-thin font-mono leading-relaxed">
{doc.rawText}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  multiline,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  if (!value) {
    return (
      <div className="flex items-center justify-between gap-2">
        <dt className="text-gray-400">{label}</dt>
        <dd className="text-gray-300 italic">—</dd>
      </div>
    );
  }
  return (
    <div className={multiline ? 'flex flex-col gap-0.5' : 'flex items-center justify-between gap-2'}>
      <dt className="text-gray-500 flex-shrink-0">{label}</dt>
      <dd className={`text-gray-800 ${mono ? 'font-mono text-[11px]' : ''} ${multiline ? '' : 'truncate'}`}>
        {value}
      </dd>
    </div>
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
