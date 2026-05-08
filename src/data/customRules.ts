/**
 * User-editable overrides for Module ③ (After Reject).
 *
 * Lives ONLY in browser localStorage — nothing goes to a server.
 * Users can:
 *   - edit the category summary / causes / next steps
 *   - edit the reply subject / body (zh + en)
 *   - add keyword patterns to improve future classification
 * The editor is designed so the built-in rules can be restored anytime.
 */
import type { Bilingual } from './types';
import type { RejectionCategory } from './rejectionPatterns';

export interface CustomOverride {
  title?: Bilingual;
  summary?: Bilingual;
  causes?: Bilingual[];
  nextSteps?: Bilingual[];
  replySubject?: Bilingual;
  replyBody?: Bilingual;
  /** Extra keywords (case-insensitive) that increase the match score */
  extraKeywords?: string[];
  /** ISO timestamp of last edit, for UI display only */
  updatedAt?: string;
}

export type CustomOverrides = Partial<Record<RejectionCategory, CustomOverride>>;

const KEY = 'pass-kyc-custom-rules-v1';

export function loadOverrides(): CustomOverrides {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as CustomOverrides;
  } catch {
    /* ignore corrupt data */
  }
  return {};
}

export function saveOverrides(overrides: CustomOverrides): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(overrides));
  } catch (err) {
    console.warn('Failed to persist custom rules', err);
  }
}

export function setOverride(
  category: RejectionCategory,
  patch: CustomOverride,
): CustomOverrides {
  const current = loadOverrides();
  const next: CustomOverrides = {
    ...current,
    [category]: {
      ...(current[category] ?? {}),
      ...patch,
      updatedAt: new Date().toISOString(),
    },
  };
  saveOverrides(next);
  return next;
}

export function clearOverride(category: RejectionCategory): CustomOverrides {
  const current = loadOverrides();
  const next: CustomOverrides = { ...current };
  delete next[category];
  saveOverrides(next);
  return next;
}

export function clearAllOverrides(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function exportOverridesJson(): string {
  return JSON.stringify(loadOverrides(), null, 2);
}

export function importOverridesJson(text: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Root must be an object keyed by category id.' };
    }
    saveOverrides(parsed as CustomOverrides);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'invalid JSON' };
  }
}
