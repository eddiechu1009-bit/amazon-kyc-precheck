import { useEffect, useState } from 'react';
import { useT } from './i18n';
import LanguageSwitcher from './components/LanguageSwitcher';
import PrivacyBadge from './components/PrivacyBadge';
import Wizard from './components/Wizard';
import AfterReject from './components/AfterReject';
import DocCheck from './components/DocCheck';
import DisclaimerModal, { needsDisclaimerAck } from './components/DisclaimerModal';
import AboutPage from './components/AboutPage';

type Mode = 'wizard' | 'doc' | 'reject';
type Route = 'home' | 'about';

function getRouteFromHash(): Route {
  if (typeof window === 'undefined') return 'home';
  return window.location.hash === '#/about' ? 'about' : 'home';
}

export default function App() {
  const { t } = useT();
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>('wizard');
  const [route, setRoute] = useState<Route>(getRouteFromHash);
  const [showDisclaimer, setShowDisclaimer] = useState(() => needsDisclaimerAck());

  // Sync route with URL hash so sharing `#/about` works, and back/forward does the right thing.
  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigateTo(next: Route) {
    if (next === 'about') {
      window.location.hash = '#/about';
    } else {
      // Clear the hash without reloading
      history.pushState('', document.title, window.location.pathname + window.location.search);
      setRoute('home');
    }
  }

  if (route === 'about') {
    return <AboutPage onBack={() => navigateTo('home')} />;
  }

  if (!started) {
    return (
      <>
        <Landing onStart={() => setStarted(true)} onOpenAbout={() => navigateTo('about')} />
        {showDisclaimer && (
          <DisclaimerModal
            onAcknowledge={() => setShowDisclaimer(false)}
            onOpenAboutPage={() => {
              setShowDisclaimer(false);
              navigateTo('about');
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showDisclaimer && (
        <DisclaimerModal
          onAcknowledge={() => setShowDisclaimer(false)}
          onOpenAboutPage={() => {
            setShowDisclaimer(false);
            navigateTo('about');
          }}
        />
      )}
      <header className="bg-shimmer text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl" role="img" aria-label="shield">🛡️</span>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate tracking-tight">
              {t('appName')}
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-300 truncate">{t('appTagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <button
            onClick={() => setStarted(false)}
            className="text-xs text-gray-300 hover:text-white transition hidden sm:inline"
          >
            ← {t('resetAll')}
          </button>
        </div>
      </header>

      {/* Mode tabs — horizontally scrollable pills on mobile */}
      <nav className="bg-white border-b sticky top-[52px] z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex overflow-x-auto snap-pills scrollbar-thin">
          <ModeTab
            active={mode === 'wizard'}
            onClick={() => setMode('wizard')}
            label={t('tabWizard')}
          />
          <ModeTab
            active={mode === 'doc'}
            onClick={() => setMode('doc')}
            label={t('tabDocCheck')}
            badge={t('optional')}
          />
          <ModeTab
            active={mode === 'reject'}
            onClick={() => setMode('reject')}
            label={t('tabAfterReject')}
            badge={t('optional')}
          />
        </div>
      </nav>

      <div className="max-w-4xl w-full mx-auto px-3 pt-3 flex justify-end">
        <PrivacyBadge />
      </div>

      <main className="max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1">
        {mode === 'wizard' && <Wizard />}
        {mode === 'doc' && <DocCheck />}
        {mode === 'reject' && <AfterReject />}
      </main>

      <Footer onOpenAbout={() => navigateTo('about')} />
    </div>
  );
}

function Landing({ onStart, onOpenAbout }: { onStart: () => void; onOpenAbout: () => void }) {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-shimmer px-4 py-6 sm:py-10 flex items-center">
      <div className="max-w-3xl w-full mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-white">
            <span className="text-xl sm:text-2xl animate-float" aria-hidden>
              🛡️
            </span>
            <span className="font-bold tracking-tight">{t('appName')}</span>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Hero card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 animate-fadeInScale relative overflow-hidden">
          {/* Subtle accent */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amazon-orange/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amazon-blue/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex justify-center mb-4">
              <PrivacyBadge inline />
            </div>

            <h1 className="text-[26px] sm:text-4xl font-bold text-amazon-dark text-center leading-[1.25] tracking-tight">
              <span className="text-amazon-warning">{t('homeTitleLead')}</span>
              <br className="sm:hidden" />
              <span className="sm:ml-2">{t('homeTitleMain')}</span>
            </h1>

            <p className="text-sm sm:text-base text-gray-600 text-center mt-4 leading-relaxed max-w-2xl mx-auto">
              {t('homeLead')}
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mt-8">
              <Step
                num="1"
                title={t('homeStep1Title')}
                desc={t('homeStep1Desc')}
                icon="📝"
                delayClass="stagger-1"
              />
              <Step
                num="2"
                title={t('homeStep2Title')}
                desc={t('homeStep2Desc')}
                icon="🔎"
                delayClass="stagger-2"
              />
              <Step
                num="3"
                title={t('homeStep3Title')}
                desc={t('homeStep3Desc')}
                icon="🎯"
                delayClass="stagger-3"
              />
            </div>

            <div className="text-center mt-8">
              <button
                onClick={onStart}
                className="group px-8 py-3.5 bg-amazon-orange text-white font-semibold rounded-xl text-lg
                  hover:bg-amazon-orange-hover hover:-translate-y-0.5 shadow-cta
                  transition-all duration-200 inline-flex items-center gap-2"
              >
                <span>{t('homeCtaStart')}</span>
                <span className="group-hover:translate-x-0.5 transition-transform" aria-hidden>
                  →
                </span>
              </button>
              <p className="text-[11px] text-gray-400 mt-4">
                {t('footerPrivacy')}
              </p>
            </div>
          </div>
        </div>

        {/* Trust microcopy */}
        <p className="text-center text-[11px] text-white/60 mt-5 leading-relaxed max-w-xl mx-auto">
          {t('sourcesDisclaimer')}
        </p>
        <div className="text-center mt-2">
          <button
            onClick={onOpenAbout}
            className="text-[11px] text-white/70 hover:text-white underline-offset-2 hover:underline transition"
          >
            {t('footerReadFull')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  num,
  title,
  desc,
  icon,
  delayClass,
}: {
  num: string;
  title: string;
  desc: string;
  icon: string;
  delayClass: string;
}) {
  return (
    <div
      className={`relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100
        hover:border-amazon-orange/30 hover:shadow-card-hover hover:-translate-y-0.5
        transition-all duration-200 animate-fadeIn ${delayClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
          <div className="w-8 h-8 bg-amazon-orange text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-cta">
            {num}
          </div>
          <div className="text-lg" aria-hidden>
            {icon}
          </div>
        </div>
        <div>
          <div className="font-semibold text-amazon-dark text-sm">{title}</div>
          <div className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 sm:flex-1 px-4 py-3 text-center text-sm font-medium border-b-2
        transition-all duration-200 whitespace-nowrap ${
          active
            ? 'border-amazon-orange text-amazon-dark bg-orange-50/50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
      aria-current={active ? 'page' : undefined}
    >
      <span>{label}</span>
      {badge && (
        <span
          className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full border ${
            active
              ? 'border-amazon-orange/30 text-amazon-orange bg-white'
              : 'border-gray-200 text-gray-400 bg-gray-50'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function Footer({ onOpenAbout }: { onOpenAbout: () => void }) {
  const { t } = useT();
  return (
    <footer className="text-center text-[11px] sm:text-xs text-gray-500 py-6 px-4 border-t mt-auto">
      <div className="max-w-2xl mx-auto bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
        <p className="leading-relaxed text-gray-600">{t('footerDisclaimerShort')}</p>
        <button
          onClick={onOpenAbout}
          className="mt-1.5 text-[11px] text-amazon-orange hover:text-amazon-orange-hover font-medium hover:underline transition"
        >
          {t('footerReadFull')}
        </button>
      </div>
      <p className="max-w-2xl mx-auto leading-relaxed">{t('footerDataSource')}</p>
      <p className="max-w-2xl mx-auto leading-relaxed mt-1">{t('footerPrivacy')}</p>
      <div className="mt-3 text-gray-400 text-[10px] uppercase tracking-wider font-semibold">
        {t('footerRelated')}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <a
          href="https://amzeuseller.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-gray-50 hover:bg-amazon-orange/10 hover:text-amazon-dark border border-gray-200 hover:border-amazon-orange/30 rounded-full transition"
        >
          {t('footerToolSellerKit')}
        </a>
        <a
          href="https://case-writer.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-gray-50 hover:bg-amazon-orange/10 hover:text-amazon-dark border border-gray-200 hover:border-amazon-orange/30 rounded-full transition"
        >
          {t('footerToolCaseWriter')}
        </a>
        <a
          href="https://eu-accounting.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-gray-50 hover:bg-amazon-orange/10 hover:text-amazon-dark border border-gray-200 hover:border-amazon-orange/30 rounded-full transition"
        >
          {t('footerToolAccounting')}
        </a>
      </div>
    </footer>
  );
}
