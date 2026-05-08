import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n';
import type { WizardAnswers, EntityType, BoCount, BankRegion, Country } from '../data/types';
import { generateChecklist } from '../data/kycRules';
import ChecklistReport from './ChecklistReport';
import Stepper from './Stepper';

type StepId = 'entity' | 'country' | 'bo' | 'bank' | 'changed';
const ALL_STEPS: StepId[] = ['entity', 'country', 'bo', 'bank', 'changed'];

interface Option<V> {
  value: V;
  label: string;
  hint?: string;
  icon?: string;
}

export default function Wizard() {
  const { t, lang } = useT();
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  const steps = useMemo<StepId[]>(() => {
    // Individual sellers skip the BO question
    return answers.entity === 'individual'
      ? ALL_STEPS.filter((s) => s !== 'bo')
      : ALL_STEPS;
  }, [answers.entity]);

  // Clamp stepIndex when steps shrink (entity changes)
  useEffect(() => {
    if (stepIndex >= steps.length) setStepIndex(steps.length - 1);
  }, [steps.length, stepIndex]);

  const currentStep = steps[stepIndex];
  const shortLabel = (id: StepId) =>
    ({
      entity: lang === 'zh' ? '主體' : 'Entity',
      country: lang === 'zh' ? '國家' : 'Country',
      bo: 'BO',
      bank: lang === 'zh' ? '銀行' : 'Bank',
      changed: lang === 'zh' ? '變更' : 'Changes',
    }[id]);

  const canGoNext = (() => {
    switch (currentStep) {
      case 'entity': return !!answers.entity;
      case 'country': return !!answers.country;
      case 'bo': return !!answers.boCount;
      case 'bank': return !!answers.bank;
      case 'changed': return !!answers.addressChanged;
      default: return false;
    }
  })();

  const goNext = () => {
    if (!canGoNext) return;
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
    else setDone(true);
  };

  const goPrev = () => {
    if (done) setDone(false);
    else if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const reset = () => {
    setAnswers({});
    setStepIndex(0);
    setDone(false);
  };

  // Keyboard: Enter advances, ArrowLeft goes back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === 'Enter' && canGoNext) {
        // Avoid double-triggers when an input has focus with custom behaviour
        if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
        goNext();
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        goPrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, canGoNext, done]);

  if (done) {
    const items = generateChecklist(answers);
    return <ChecklistReport items={items} answers={answers} onEdit={() => setDone(false)} />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stepper */}
      <div className="mb-6 sm:mb-7">
        <Stepper
          total={steps.length}
          current={stepIndex}
          labels={steps.map((s) => shortLabel(s))}
        />
        <div className="flex justify-between items-center mt-3">
          <span className="text-xs text-gray-500">{t('wizardProgress')}</span>
          <span className="text-xs font-mono text-gray-500">
            {stepIndex + 1} / {steps.length}
          </span>
        </div>
      </div>

      {/* First-step intro */}
      {stepIndex === 0 && !answers.entity && (
        <div className="mb-5 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border border-orange-100 rounded-xl p-4 sm:p-5 animate-fadeIn">
          <div className="flex items-start gap-3">
            <span className="text-xl sm:text-2xl leading-none animate-float">🧭</span>
            <div>
              <div className="text-base sm:text-lg font-semibold text-amazon-dark leading-snug">
                {t('wizardIntroTitle')}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                {t('wizardIntroDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div key={currentStep} className="animate-fadeIn">
        {currentStep === 'entity' && (
          <QuestionCard title={t('qEntityTypeTitle')} hint={t('qEntityTypeHint')}>
            <OptionList
              value={answers.entity}
              onChange={(v: EntityType) => setAnswers({ ...answers, entity: v })}
              options={[
                { value: 'limited', label: t('optLimited'), hint: t('optLimitedHint'), icon: '🏢' },
                { value: 'sole_prop', label: t('optSoleProp'), hint: t('optSolePropHint'), icon: '🏪' },
                { value: 'individual', label: t('optIndividual'), hint: t('optIndividualHint'), icon: '👤' },
              ]}
            />
          </QuestionCard>
        )}

        {currentStep === 'country' && (
          <QuestionCard title={t('qCountryTitle')} hint={t('qCountryHint')}>
            <OptionList
              value={answers.country}
              onChange={(v: Country) => setAnswers({ ...answers, country: v })}
              options={[
                { value: 'TW', label: lang === 'zh' ? '台灣' : 'Taiwan', icon: '🇹🇼' },
                { value: 'HK', label: lang === 'zh' ? '香港' : 'Hong Kong', icon: '🇭🇰' },
                { value: 'CN', label: lang === 'zh' ? '中國大陸' : 'Mainland China', icon: '🇨🇳' },
                { value: 'Other', label: lang === 'zh' ? '其他' : 'Other', icon: '🌏' },
              ]}
              columns={2}
            />
          </QuestionCard>
        )}

        {currentStep === 'bo' && (
          <QuestionCard title={t('qBoCountTitle')} hint={t('qBoCountHint')}>
            <OptionList
              value={answers.boCount}
              onChange={(v: BoCount) => setAnswers({ ...answers, boCount: v })}
              options={[
                { value: '1', label: t('optBo1'), icon: '👤' },
                { value: '2', label: t('optBo2'), icon: '👥' },
                { value: '3+', label: t('optBo3'), icon: '👨‍👩‍👧' },
              ]}
              columns={3}
            />
          </QuestionCard>
        )}

        {currentStep === 'bank' && (
          <QuestionCard title={t('qBankTitle')} hint={t('qBankHint')}>
            <OptionList
              value={answers.bank}
              onChange={(v: BankRegion) => setAnswers({ ...answers, bank: v })}
              options={[
                { value: 'tw', label: t('optBankTw'), icon: '🏦' },
                { value: 'hk', label: t('optBankHk'), icon: '🏦' },
                { value: 'us', label: t('optBankUs'), icon: '🏦' },
                { value: 'eu', label: t('optBankEu'), icon: '🏦' },
                { value: 'third_party', label: t('optBank3p'), icon: '💳' },
              ]}
            />
          </QuestionCard>
        )}

        {currentStep === 'changed' && (
          <QuestionCard title={t('qAddressChangedTitle')} hint={t('qAddressChangedHint')}>
            <OptionList
              value={answers.addressChanged}
              onChange={(v: 'yes' | 'no') => setAnswers({ ...answers, addressChanged: v })}
              options={[
                { value: 'yes', label: t('optYes'), icon: '✅' },
                { value: 'no', label: t('optNo'), icon: '➖' },
              ]}
              columns={2}
            />
          </QuestionCard>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between gap-3">
        <button
          onClick={goPrev}
          disabled={stepIndex === 0}
          className="px-4 py-2.5 text-sm rounded-lg border border-gray-300 text-gray-600
            hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200"
        >
          {t('wizardPrev')}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="px-3 py-2.5 text-xs rounded-lg text-gray-400 hover:text-amazon-warning transition"
          >
            {t('resetAll')}
          </button>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="group px-5 sm:px-6 py-2.5 text-sm font-semibold rounded-lg bg-amazon-orange text-white
              hover:bg-amazon-orange-hover hover:-translate-y-0.5 shadow-cta
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none
              transition-all duration-200 inline-flex items-center gap-1"
          >
            <span>{stepIndex === steps.length - 1 ? t('wizardSubmit') : t('wizardNext')}</span>
            {canGoNext && (
              <span className="hidden sm:inline text-[10px] opacity-70 ml-1 font-mono">↵</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-7">
      <h2 className="text-lg sm:text-xl font-bold text-amazon-dark leading-snug">{title}</h2>
      {hint && <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">{hint}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function OptionList<V extends string>({
  value,
  onChange,
  options,
  columns = 1,
}: {
  value: V | undefined;
  onChange: (v: V) => void;
  options: Option<V>[];
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div className={`grid gap-2.5 ${grid}`} role="radiogroup">
      {options.map((opt, i) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`group relative text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-200 animate-fadeIn ${
              selected
                ? 'border-amazon-orange bg-orange-50/60 shadow-card'
                : 'border-gray-200 hover:border-amazon-orange/40 hover:bg-gray-50 hover:-translate-y-0.5'
            } stagger-${Math.min(i + 1, 5)}`}
          >
            <div className="flex items-center gap-3">
              {opt.icon && (
                <span
                  className={`flex-shrink-0 text-xl sm:text-2xl transition-transform duration-200 ${
                    selected ? 'scale-110' : 'group-hover:scale-110'
                  }`}
                  aria-hidden
                >
                  {opt.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div
                  className={`font-semibold text-sm sm:text-[15px] transition-colors ${
                    selected ? 'text-amazon-dark' : 'text-gray-800 group-hover:text-amazon-dark'
                  }`}
                >
                  {opt.label}
                </div>
                {opt.hint && (
                  <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {opt.hint}
                  </div>
                )}
              </div>
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  selected
                    ? 'border-amazon-orange bg-amazon-orange scale-110'
                    : 'border-gray-300 group-hover:border-amazon-orange/60'
                }`}
                aria-hidden
              >
                {selected && <div className="w-2 h-2 bg-white rounded-full animate-checkPop" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
