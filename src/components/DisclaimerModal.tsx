import { useEffect, useState } from 'react';
import { useT } from '../i18n';

/**
 * First-time disclaimer popup.
 *
 * Shown only on a seller's first visit (tracked via localStorage).
 * Once they confirm "I understand", the key is saved and the popup is
 * suppressed on every subsequent visit. Bumping DISCLAIMER_VERSION re-triggers
 * the popup globally — use this when the disclaimer content meaningfully
 * changes (e.g. new data source policy, new legal wording).
 */
const STORAGE_KEY = 'pass-kyc-ack-v1';
const DISCLAIMER_VERSION = '2026-05-12';

/** Returns true if the current user has NOT yet acknowledged the disclaimer
 *  (either never acked, corrupted storage, or acked an older version). */
export function needsDisclaimerAck(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return true;
    return parsed.version !== DISCLAIMER_VERSION;
  } catch {
    return true;
  }
}

function ackDisclaimer(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: DISCLAIMER_VERSION, ackedAt: new Date().toISOString() }),
    );
  } catch {
    /* storage may be blocked in private mode — user will see the popup again,
       which is acceptable */
  }
}

interface Props {
  /** Called when the user clicks OK. Parent should dismiss the modal. */
  onAcknowledge: () => void;
  /** Called when the user clicks "read full disclaimer" link. */
  onOpenAboutPage: () => void;
}

export default function DisclaimerModal({ onAcknowledge, onOpenAboutPage }: Props) {
  const { t } = useT();
  const [checked, setChecked] = useState(false);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleConfirm() {
    if (!checked) return;
    ackDisclaimer();
    onAcknowledge();
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-3 py-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-fadeInScale">
        <div className="px-5 sm:px-7 pt-6 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-2xl" aria-hidden>
              📋
            </span>
            <h2
              id="disclaimer-title"
              className="text-lg sm:text-xl font-bold text-amazon-dark tracking-tight"
            >
              {t('disclaimerModalTitle')}
            </h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mt-2">
            {t('disclaimerModalIntro')}
          </p>
        </div>

        <div className="px-5 sm:px-7 py-5 space-y-3">
          <DisclaimerBullet icon="🏷️" text={t('disclaimerBullet1')} />
          <DisclaimerBullet icon="⚖️" text={t('disclaimerBullet2')} />
          <DisclaimerBullet icon="🔒" text={t('disclaimerBullet3')} />

          <button
            type="button"
            onClick={onOpenAboutPage}
            className="text-xs text-amazon-orange hover:text-amazon-orange-hover hover:underline font-medium transition"
          >
            {t('disclaimerReadFull')} →
          </button>
        </div>

        <div className="px-5 sm:px-7 pb-6 border-t border-gray-100 pt-4 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-amazon-orange focus:ring-2 focus:ring-amazon-orange/40 cursor-pointer flex-shrink-0"
            />
            <span className="text-sm text-gray-700 leading-relaxed group-hover:text-amazon-dark transition">
              {t('disclaimerAcknowledge')}
            </span>
          </label>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!checked}
            className={`w-full py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
              checked
                ? 'bg-amazon-orange text-white hover:bg-amazon-orange-hover shadow-cta hover:-translate-y-0.5'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {t('disclaimerOk')} →
          </button>
        </div>
      </div>
    </div>
  );
}

function DisclaimerBullet({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-3.5 py-3 border border-gray-100">
      <span className="text-xl flex-shrink-0 leading-none pt-0.5" aria-hidden>
        {icon}
      </span>
      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}
