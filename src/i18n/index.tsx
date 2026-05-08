import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { zh } from './zh';
import { en } from './en';

export type Lang = 'zh' | 'en';
export type Dict = typeof zh;

const dicts: Record<Lang, Dict> = { zh, en };

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof Dict) => string;
  /** 對於不在字典裡的內容，傳兩邊文字直接切換 */
  tx: (pair: { zh: string; en: string }) => string;
}

const LanguageContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'pass-kyc-lang';

function detectInitialLang(): Lang {
  try {
    // URL 參數優先
    const url = new URL(window.location.href);
    const urlLang = url.searchParams.get('lang');
    if (urlLang === 'en' || urlLang === 'zh') return urlLang;
    // 儲存偏好其次
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
    // 瀏覽器語言最後
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('zh')) return 'zh';
    return 'en';
  } catch {
    return 'zh';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
    } catch { /* ignore */ }
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = dicts[lang];
    return {
      lang,
      setLang: setLangState,
      t: (key) => (dict[key] as string) ?? (zh[key] as string) ?? String(key),
      tx: (pair) => pair[lang],
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT must be used inside LanguageProvider');
  return ctx;
}
