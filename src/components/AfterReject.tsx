import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import { classifyRejection, type ClassifyResult } from '../data/rejectionPatterns';
import { getTemplate } from '../data/replyTemplates';
import SourcesBlock from './SourcesBlock';
import { copyToClipboard } from '../lib/export';
import RuleEditor, { CustomRulesToolbar } from './RuleEditor';

export default function AfterReject() {
  const { t, tx, lang } = useT();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = () => {
    setError(null);
    if (text.trim().length < 20) {
      setError(t('afterRejectTooShort'));
      return;
    }
    setResult(classifyRejection(text));
  };

  const handleReset = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto animate-fadeIn">
        <div className="flex justify-end mb-2">
          <CustomRulesToolbar onChanged={() => { /* no classify yet */ }} />
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-7">
          <h2 className="text-lg sm:text-xl font-bold text-amazon-dark leading-snug">
            {t('afterRejectTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
            {t('afterRejectHint')}
          </p>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t('afterRejectPlaceholder')}
            className="mt-5 w-full h-56 sm:h-64 resize-none rounded-xl border-2 border-gray-200
              focus:border-amazon-orange focus:ring-4 focus:ring-amazon-orange/10
              p-4 text-sm leading-relaxed text-gray-800 font-mono
              placeholder:font-sans placeholder:text-gray-400 transition-colors
              outline-none"
          />

          {error && (
            <div className="mt-2 text-xs text-amazon-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2 animate-fadeIn">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-amazon-success bg-amazon-success/10 border border-amazon-success/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 bg-amazon-success rounded-full animate-pulse" />
              <span>{t('privacyBadge')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setText('')}
                disabled={!text}
                className="px-3 py-2 text-xs rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-40 transition"
              >
                {t('afterRejectReset')}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={text.trim().length < 20}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-amazon-orange text-white
                  hover:bg-amazon-orange-hover hover:-translate-y-0.5 shadow-cta
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none
                  transition-all duration-200"
              >
                {t('afterRejectAnalyze')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AnalysisResult result={result} onReset={handleReset} onRefresh={() => setResult(classifyRejection(text))} />;
}

function AnalysisResult({
  result,
  onReset,
  onRefresh,
}: {
  result: ClassifyResult;
  onReset: () => void;
  onRefresh: () => void;
}) {
  const { t, tx, lang } = useT();
  const [replyLang, setReplyLang] = useState<'zh' | 'en'>(lang);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [editing, setEditing] = useState(false);

  const template = useMemo(() => getTemplate(result.category), [result.category, result]);
  const subject = replyLang === 'zh' ? template.subject.zh : template.subject.en;
  const body = replyLang === 'zh' ? template.body.zh : template.body.en;

  const doCopy = async (s: string, kind: 'subject' | 'body') => {
    const ok = await copyToClipboard(s);
    if (ok) {
      if (kind === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 1800);
      } else {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 1800);
      }
    }
  };

  const isUnknown = result.category === 'unknown';

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn pb-8">
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-amazon-orange transition inline-flex items-center gap-1"
        >
          ← {t('afterRejectTryAgain')}
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-amazon-orange/40 text-amazon-orange hover:bg-orange-50 transition inline-flex items-center gap-1"
          >
            ✎ {t('editorOpen')}
          </button>
          <CustomRulesToolbar onChanged={onRefresh} />
        </div>
      </div>

      {/* Diagnosis card */}
      <div className="relative bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-7 overflow-hidden mb-4">
        <div
          className={`absolute inset-x-0 top-0 h-1 ${
            isUnknown
              ? 'bg-gray-300'
              : 'bg-gradient-to-r from-amazon-orange via-amber-400 to-yellow-400'
          }`}
        />
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
              isUnknown
                ? 'bg-gray-100 text-gray-500'
                : 'bg-orange-100 text-amazon-orange'
            }`}
          >
            {isUnknown ? '🤔' : '🎯'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {t('afterRejectCategory')}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-amazon-dark leading-snug mt-0.5">
              {tx(result.def.title)}
            </h2>
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
              {tx(result.def.summary)}
            </p>
          </div>
        </div>

        {result.matchedSignals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('afterRejectConfidence')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.matchedSignals.slice(0, 5).map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5"
                >
                  “{s}”
                </span>
              ))}
            </div>
          </div>
        )}

        {result.alternatives.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('afterRejectAlternatives')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.alternatives.map((alt) => (
                <span
                  key={alt.category}
                  className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5"
                >
                  {tx(alt.def.title)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Causes */}
      {result.def.causes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span>⚠️</span>
            <h3 className="text-base font-semibold text-amazon-dark">
              {t('afterRejectCauses')}
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            {result.def.causes.map((c, i) => (
              <li key={i} className="flex gap-2 leading-relaxed">
                <span className="text-amazon-warning flex-shrink-0">•</span>
                <span>{tx(c)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next steps */}
      {result.def.nextSteps.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span>🧭</span>
            <h3 className="text-base font-semibold text-amazon-dark">
              {t('afterRejectNextSteps')}
            </h3>
          </div>
          <ol className="space-y-3">
            {result.def.nextSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amazon-orange/10 text-amazon-orange text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">
                  {tx(step)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Reply draft */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-6 mb-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span>✉️</span>
              <h3 className="text-base font-semibold text-amazon-dark">
                {t('afterRejectReplyTitle')}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {t('afterRejectReplyHint')}
            </p>
          </div>
          <div className="flex-shrink-0 inline-flex rounded-lg bg-gray-100 p-0.5 text-xs">
            <button
              onClick={() => setReplyLang('zh')}
              className={`px-2.5 py-1 rounded-md transition ${
                replyLang === 'zh'
                  ? 'bg-white shadow-sm text-amazon-dark font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('afterRejectReplyTabZh')}
            </button>
            <button
              onClick={() => setReplyLang('en')}
              className={`px-2.5 py-1 rounded-md transition ${
                replyLang === 'en'
                  ? 'bg-white shadow-sm text-amazon-dark font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('afterRejectReplyTabEn')}
            </button>
          </div>
        </div>

        {/* Subject */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Subject
            </span>
            <button
              onClick={() => doCopy(subject, 'subject')}
              className="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition inline-flex items-center gap-1"
            >
              {copiedSubject ? (
                <>
                  <span className="text-amazon-success">✓</span> {t('copied')}
                </>
              ) : (
                t('afterRejectCopySubject')
              )}
            </button>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-medium">
            {subject}
          </div>
        </div>

        {/* Body */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Body
            </span>
            <button
              onClick={() => doCopy(body, 'body')}
              className="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition inline-flex items-center gap-1"
            >
              {copiedBody ? (
                <>
                  <span className="text-amazon-success">✓</span> {t('copied')}
                </>
              ) : (
                t('afterRejectCopyBody')
              )}
            </button>
          </div>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed max-h-[440px] overflow-y-auto scrollbar-thin">
{body}
          </pre>
        </div>
      </div>

      {/* Sources */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-6">
        <SourcesBlock sources={result.def.sources} />
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
        {t('sourcesDisclaimer')}
      </p>

      {editing && (
        <RuleEditor
          category={result.category}
          onClose={() => setEditing(false)}
          onChanged={onRefresh}
        />
      )}
    </div>
  );
}
