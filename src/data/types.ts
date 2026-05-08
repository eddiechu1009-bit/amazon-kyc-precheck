// Core types for the KYC precheck wizard + rules engine

export type EntityType = 'limited' | 'sole_prop' | 'individual';
export type BankRegion = 'tw' | 'hk' | 'us' | 'eu' | 'third_party';
export type BoCount = '1' | '2' | '3+';
export type Country = 'TW' | 'HK' | 'CN' | 'Other';

export interface WizardAnswers {
  entity?: EntityType;
  country?: Country;
  boCount?: BoCount;
  bank?: BankRegion;
  addressChanged?: 'yes' | 'no';
}

export type Priority = 'required' | 'conditional' | 'recommended';

export interface Bilingual {
  zh: string;
  en: string;
}

/**
 * 來源標註 — 強制規則,見 .kiro/steering/source-attribution.md
 *
 * 分兩類:
 * 1. `sources` (公開) — 只能是 'official' 或 'experience'，賣家會看到
 * 2. `internalRefs` (內部) — 可以是 'internal_wiki' 或 'case_evidence'，絕不渲染
 */
export type PublicSourceType = 'official' | 'experience';
export type InternalSourceType = 'internal_wiki' | 'case_evidence';
export type SourceType = PublicSourceType | InternalSourceType;

export interface Source {
  type: SourceType;
  label: Bilingual;
  url?: string;
  /** YYYY-MM-DD, when this info was last verified */
  retrievedAt?: string;
  note?: Bilingual;
}

export interface ChecklistItem {
  id: string;
  title: Bilingual;
  why: Bilingual;
  prepTips: Bilingual[];
  commonRejection: Bilingual[];
  priority: Priority;
  category: 'identity' | 'entity' | 'address' | 'bank' | 'other';
  /**
   * PUBLIC sources — rendered to sellers. At least one required.
   * Must only contain 'official' or 'experience' type entries.
   */
  sources: Source[];
  /**
   * INTERNAL references — never rendered. For our own traceability only.
   * Must only contain 'internal_wiki' or 'case_evidence' type entries.
   * Do NOT include specific URLs, case IDs, PII, or company names here.
   */
  internalRefs?: Source[];
}

// A rule picks items based on answers
export interface Rule {
  id: string;
  when: (a: WizardAnswers) => boolean;
  items: ChecklistItem[];
}
