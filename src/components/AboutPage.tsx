import { useT } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';
import ContactForm from './ContactForm';

/**
 * Full disclaimer / attribution page.
 * Reached via the `#/about` hash route or via the "read full disclaimer" link
 * in the first-time modal and footer.
 */

const LAST_UPDATED = '2026-05-12';

interface Props {
  onBack: () => void;
}

export default function AboutPage({ onBack }: Props) {
  const { t } = useT();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-shimmer text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white hover:text-gray-200 transition text-sm font-medium"
        >
          <span>{t('aboutBack')}</span>
        </button>
        <LanguageSwitcher />
      </header>

      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1">
        <div className="bg-white rounded-2xl shadow-card p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-amazon-dark tracking-tight">
            {t('aboutPageTitle')}
          </h1>
          <p className="text-xs text-gray-400 mt-2">
            {t('aboutLastUpdated')}: {LAST_UPDATED}
          </p>

          <div className="mt-8 space-y-8">
            <Section title={t('aboutSection1Title')}>
              <p>{t('aboutSection1Body')}</p>
            </Section>

            <Section title={t('aboutSection2Title')}>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('aboutSection2Bullet1')}</li>
                <li>{t('aboutSection2Bullet2')}</li>
                <li>{t('aboutSection2Bullet3')}</li>
                <li>{t('aboutSection2Bullet4')}</li>
              </ul>
            </Section>

            <Section title={t('aboutSection3Title')}>
              <p className="mb-3">{t('aboutSection3Body')}</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('aboutSection3Bullet1')}</li>
                <li>{t('aboutSection3Bullet2')}</li>
                <li>{t('aboutSection3Bullet3')}</li>
                <li>{t('aboutSection3Bullet4')}</li>
                <li>{t('aboutSection3Bullet5')}</li>
              </ul>
            </Section>

            <Section title={t('aboutSection4Title')}>
              <p className="mb-3">{t('aboutSection4Body')}</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('aboutSection4Bullet1')}</li>
                <li>{t('aboutSection4Bullet2')}</li>
                <li>{t('aboutSection4Bullet3')}</li>
              </ul>
            </Section>

            <Section title={t('aboutSection5Title')}>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('aboutSection5Bullet1')}</li>
                <li>{t('aboutSection5Bullet2')}</li>
                <li>{t('aboutSection5Bullet3')}</li>
                <li>{t('aboutSection5Bullet4')}</li>
              </ul>
            </Section>

            <Section title={t('aboutSection6Title')}>
              <p className="mb-4">{t('aboutSection6Body')}</p>

              <ContactForm />
            </Section>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100">
            <button
              onClick={onBack}
              className="text-sm text-amazon-orange hover:text-amazon-orange-hover font-medium"
            >
              {t('aboutBack')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-bold text-amazon-dark mb-3 tracking-tight">
        {title}
      </h2>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}
