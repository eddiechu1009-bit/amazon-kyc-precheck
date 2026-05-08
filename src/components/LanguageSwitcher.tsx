import { useT } from '../i18n';

interface Props {
  /** 'header' = white-on-dark, 'surface' = dark-on-light */
  variant?: 'header' | 'surface';
}

export default function LanguageSwitcher({ variant = 'header' }: Props) {
  const { lang, setLang } = useT();

  const container =
    variant === 'header'
      ? 'bg-white/10 hover:bg-white/15'
      : 'bg-gray-100 hover:bg-gray-200';

  const activeClass =
    variant === 'header'
      ? 'bg-white text-amazon-dark font-semibold shadow-sm'
      : 'bg-amazon-dark text-white font-semibold shadow-sm';

  const inactiveClass =
    variant === 'header'
      ? 'text-white/70 hover:text-white'
      : 'text-gray-500 hover:text-gray-800';

  const makeBtn = (target: 'zh' | 'en', label: string) => (
    <button
      onClick={() => setLang(target)}
      className={`px-3 py-1 rounded-full transition-all duration-200 focus-visible:outline-none ${
        lang === target ? activeClass : inactiveClass
      }`}
      aria-pressed={lang === target}
      aria-label={`Switch to ${target === 'zh' ? 'Chinese' : 'English'}`}
    >
      {label}
    </button>
  );

  return (
    <div className={`inline-flex items-center rounded-full p-0.5 text-xs transition-colors ${container}`}>
      {makeBtn('zh', '中文')}
      {makeBtn('en', 'EN')}
    </div>
  );
}
