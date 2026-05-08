import { useState } from 'react';
import { useT } from '../i18n';

/**
 * Compact privacy indicator. Click to reveal detail popover.
 * Used everywhere the user is about to see / provide information.
 */
export default function PrivacyBadge({ inline = false }: { inline?: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className={inline ? 'relative inline-block' : 'relative'}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        className="group text-[11px] sm:text-xs bg-amazon-success/10 text-amazon-success hover:bg-amazon-success/15
          border border-amazon-success/30 rounded-full px-3 py-1 font-medium transition-all duration-200 cursor-help
          inline-flex items-center gap-1.5"
        aria-expanded={open}
      >
        <span className="w-1.5 h-1.5 bg-amazon-success rounded-full animate-pulse" />
        {t('privacyBadge')}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-card-hover border border-gray-200 p-3.5 text-xs text-gray-700 z-50 animate-fadeIn"
          role="tooltip"
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">🔒</span>
            <p className="leading-relaxed">{t('privacyDetail')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
