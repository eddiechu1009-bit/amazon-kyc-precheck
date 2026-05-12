import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import type { ChecklistItem, Priority, WizardAnswers } from '../data/types';
import SourcesBlock from './SourcesBlock';
import { buildMarkdown, downloadText, copyToClipboard } from '../lib/export';

interface Props {
  items: ChecklistItem[];
  answers: WizardAnswers;
  onEdit: () => void;
}

export default function ChecklistReport({ items, answers, onEdit }: Props) {
  const { t, lang, tx } = useT();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const grouped = useMemo(
    () => ({
      required: items.filter((i) => i.priority === 'required'),
      conditional: items.filter((i) => i.priority === 'conditional'),
      recommended: items.filter((i) => i.priority === 'recommended'),
    }),
    [items],
  );

  const doneCount = items.filter((i) => checked.has(i.id)).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const handleCopy = async () => {
    const md = buildMarkdown(items, answers, lang, tx);
    const ok = await copyToClipboard(md);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const md = buildMarkdown(items, answers, lang, tx);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`pass-kyc-checklist-${stamp}.md`, md);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn pb-24 sm:pb-6">
      <button
        onClick={onEdit}
        className="text-sm text-gray-500 hover:text-amazon-orange mb-4 transition inline-flex items-center gap-1"
      >
        {t('reportBack')}
      </button>

      {/* Hero summary */}
      <div className="relative bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-7 mb-4 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amazon-orange via-amber-400 to-yellow-400" />

        <h2 className="text-xl sm:text-2xl font-bold text-amazon-dark">{t('reportTitle')}</h2>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{t('reportSubtitle')}</p>

        {/* Stats tiles */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
          <Tile
            label={t('reportRequired')}
            value={grouped.required.length}
            tone="required"
          />
          <Tile
            label={t('reportConditional')}
            value={grouped.conditional.length}
            tone="conditional"
          />
          <Tile
            label={t('reportRecommended')}
            value={grouped.recommended.length}
            tone="recommended"
          />
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amazon-success to-green-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="text-sm font-mono text-gray-600 tabular-nums">
              {doneCount} / {items.length}
            </span>
          </div>
        </div>

        {/* Export actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700
              hover:bg-gray-50 hover:border-gray-300 transition inline-flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <span className="text-amazon-success">✓</span>
                {t('copied')}
              </>
            ) : (
              <>
                <span>📋</span>
                {t('copy')}
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700
              hover:bg-gray-50 hover:border-gray-300 transition inline-flex items-center gap-1.5"
          >
            <span>⬇️</span>
            {t('download')} .md
          </button>
        </div>
      </div>

      {/* Sections */}
      {grouped.required.length > 0 && (
        <Section title={t('reportRequired')} priority="required" count={grouped.required.length}>
          {grouped.required.map((item, i) => (
            <Card
              key={item.id}
              item={item}
              checked={checked.has(item.id)}
              onToggle={() => toggle(item.id)}
              staggerIndex={i}
              defaultExpanded={i === 0}
            />
          ))}
        </Section>
      )}

      {grouped.conditional.length > 0 && (
        <Section
          title={t('reportConditional')}
          priority="conditional"
          count={grouped.conditional.length}
        >
          {grouped.conditional.map((item, i) => (
            <Card
              key={item.id}
              item={item}
              checked={checked.has(item.id)}
              onToggle={() => toggle(item.id)}
              staggerIndex={i}
            />
          ))}
        </Section>
      )}

      {grouped.recommended.length > 0 && (
        <Section
          title={t('reportRecommended')}
          priority="recommended"
          count={grouped.recommended.length}
        >
          {grouped.recommended.map((item, i) => (
            <Card
              key={item.id}
              item={item}
              checked={checked.has(item.id)}
              onToggle={() => toggle(item.id)}
              staggerIndex={i}
            />
          ))}
        </Section>
      )}

      {/* Next-step callout */}
      <div className="mt-6 bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🎯</span>
          <div>
            <div className="text-sm font-semibold text-blue-900 mb-1">
              {t('reportNextStep')}
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">{t('reportNextStepMsg')}</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
        {t('sourcesDisclaimer')}
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Priority;
}) {
  const styles = {
    required: 'bg-red-50 border-red-100 text-red-700',
    conditional: 'bg-amber-50 border-amber-100 text-amber-700',
    recommended: 'bg-blue-50 border-blue-100 text-blue-700',
  }[tone];
  return (
    <div className={`rounded-xl border p-2.5 sm:p-3 ${styles}`}>
      <div className="text-[10px] sm:text-xs uppercase tracking-wide font-semibold opacity-80">
        {label}
      </div>
      <div className="text-xl sm:text-2xl font-bold mt-0.5 animate-countUp tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  priority,
  count,
  children,
}: {
  title: string;
  priority: Priority;
  count: number;
  children: React.ReactNode;
}) {
  const badge = {
    required: 'bg-red-50 text-red-700 border-red-200',
    conditional: 'bg-amber-50 text-amber-700 border-amber-200',
    recommended: 'bg-blue-50 text-blue-700 border-blue-200',
  }[priority];
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}
        >
          <span>{title}</span>
          <span className="bg-white/60 px-1.5 rounded-full text-[10px] font-mono">{count}</span>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Card({
  item,
  checked,
  onToggle,
  staggerIndex,
  defaultExpanded = false,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: () => void;
  staggerIndex: number;
  defaultExpanded?: boolean;
}) {
  const { lang, tx } = useT();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const expandLabel = expanded
    ? lang === 'zh'
      ? '收合內容'
      : 'Collapse'
    : lang === 'zh'
    ? '查看準備重點與退件原因'
    : 'See prep tips & rejection reasons';

  return (
    <div
      className={`group bg-white rounded-xl border transition-all duration-200 animate-fadeIn stagger-${Math.min(
        staggerIndex + 1,
        5,
      )} ${
        checked
          ? 'border-green-300 bg-green-50/40 shadow-card'
          : expanded
          ? 'border-amazon-orange/60 shadow-card-hover'
          : 'border-gray-200 shadow-card hover:shadow-card-hover hover:border-amazon-orange/40 hover:bg-orange-50/20'
      }`}
    >
      {/* Clickable header — entire row expands/collapses */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3 focus:outline-none focus:ring-2 focus:ring-amazon-orange/30 rounded-xl"
        aria-expanded={expanded}
      >
        {/* Checkbox (swallow click so it doesn't also toggle expand) */}
        <span
          role="checkbox"
          tabIndex={0}
          aria-checked={checked}
          aria-label="toggle done"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }
          }}
          className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
            checked
              ? 'border-amazon-success bg-amazon-success text-white scale-110'
              : 'border-gray-300 hover:border-amazon-success hover:scale-110'
          }`}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-checkPop">
              <path
                d="M2 6L5 9L10 3"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div
            className={`font-semibold text-sm sm:text-[15px] transition-colors ${
              checked ? 'text-gray-500 line-through' : 'text-amazon-dark'
            }`}
          >
            {tx(item.title)}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-relaxed">
            {tx(item.why)}
          </div>

          {/* Obvious CTA pill — looks like a real button */}
          <span
            className={`inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              expanded
                ? 'bg-amazon-orange text-white border-amazon-orange'
                : 'bg-orange-50 text-amazon-orange border-amazon-orange/30 group-hover:bg-amazon-orange group-hover:text-white group-hover:border-amazon-orange'
            }`}
          >
            <span>{expandLabel}</span>
            <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </span>
        </div>

        {/* Right chevron — secondary affordance */}
        <span
          aria-hidden
          className={`flex-shrink-0 mt-1 text-gray-300 group-hover:text-amazon-orange transition-all duration-200 ${
            expanded ? 'rotate-90 text-amazon-orange' : ''
          }`}
        >
          ›
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 animate-slideDown">
          <div className="ml-8 border-l-2 border-amazon-orange/20 pl-4 space-y-4">
            {item.prepTips.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-amazon-success mb-1.5 inline-flex items-center gap-1.5">
                  <span>✅</span>
                  <span>{lang === 'zh' ? '準備重點' : 'Prep tips'}</span>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  {item.prepTips.map((tip, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="text-amazon-success/60 flex-shrink-0">•</span>
                      <span>{tx(tip)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.commonRejection.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-amazon-danger mb-1.5 inline-flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{lang === 'zh' ? '常見退件原因' : 'Common rejection reasons'}</span>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  {item.commonRejection.map((r, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="text-amazon-danger/60 flex-shrink-0">•</span>
                      <span>{tx(r)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <SourcesBlock sources={item.sources} />
          </div>
        </div>
      )}
    </div>
  );
}
