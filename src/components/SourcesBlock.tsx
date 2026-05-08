import { useT } from '../i18n';
import type { Source, SourceType } from '../data/types';

// Only 'official' and 'experience' are ever rendered. Anything else would
// mean an internal source leaked into the render path — we skip and warn.
const typeStyle: Partial<Record<SourceType, { bg: string; text: string; border: string }>> = {
  official: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  experience: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
};

export default function SourcesBlock({ sources }: { sources: Source[] }) {
  const { t, tx } = useT();
  if (!sources || sources.length === 0) return null;

  // Belt-and-suspenders: filter out anything that is NOT a public type,
  // even if the engine should have stripped it already.
  const publicSources = sources.filter(
    (s) => s.type === 'official' || s.type === 'experience',
  );
  if (publicSources.length === 0) return null;

  const typeLabel = (type: SourceType) =>
    type === 'official' ? t('sourceOfficial') : t('sourceExperience');

  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <span>📚</span>
        <span>{t('sourcesTitle')}</span>
      </div>
      <ul className="space-y-2">
        {publicSources.map((s, i) => {
          const style = typeStyle[s.type]!;
          return (
            <li
              key={i}
              className={`rounded-md border ${style.border} ${style.bg} p-2.5 text-xs`}
            >
              <div className="flex items-start gap-2 flex-wrap">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded border ${style.border} ${style.text} bg-white font-medium text-[10px] tracking-wide uppercase`}
                >
                  {typeLabel(s.type)}
                </span>
                <span className="flex-1 min-w-0 text-gray-800 font-medium">
                  {tx(s.label)}
                </span>
                {s.retrievedAt && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    {t('sourceRetrievedAt')} · {s.retrievedAt}
                  </span>
                )}
              </div>
              {s.note && (
                <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">
                  {tx(s.note)}
                </p>
              )}
              {s.url && s.type === 'official' && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-block mt-1.5 text-[11px] ${style.text} hover:underline font-medium`}
                >
                  {t('sourceLinkExternal')}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
