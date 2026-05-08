/**
 * Best-effort field extraction from raw OCR / PDF text.
 *
 * These are deliberately conservative — we don't try to be clever; if we
 * aren't sure, we return undefined so the seller can paste the value
 * manually. Never "decide" a field is correct; always display what we
 * extracted and let the user confirm.
 */

export interface NameCandidate {
  value: string;
  /** Heuristic: name contains bank-related tokens (likely bank, not holder) */
  likelyBank: boolean;
}

export interface AddressCandidate {
  value: string;
  /** Heuristic: address lives in a bank-header context (likely bank, not holder) */
  likelyBankAddress: boolean;
}

export interface ExtractedFields {
  /** Best guess for the account holder (after filtering obvious bank names). */
  accountHolder?: string;
  /** All detected names with hints — the UI can surface them for user override. */
  nameCandidates: NameCandidate[];
  iban?: string;
  bic?: string;
  /** Full account number if visible */
  accountNumber?: string;
  /** ISO date string if a date was found */
  issueDate?: string;
  /** Best-guess address for the holder (after filtering bank-looking addresses). */
  bestAddress?: string;
  /** All detected addresses with hints. */
  addressCandidates: AddressCandidate[];
  /** Taiwan tax ID (統一編號 8 digits) if present */
  taiwanTaxId?: string;
}

const IBAN_RE = /\b([A-Z]{2}\d{2}[\sA-Z0-9]{11,30})\b/g;
const BIC_RE = /\b([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/g;
const TAX_ID_RE = /\b(\d{8})\b/g;
const ACCT_NO_RE = /(?:Account\s*(?:No|Number)?|A\/C\s*No\.?|帳[戶號]\s*號?碼?)\s*[:：]?\s*([\d\-\s]{6,25})/i;
const HOLDER_RE = /(?:Account\s+Holder|Beneficiary|Customer\s+Name|戶名|持有人)\s*[:：]?\s*(.+?)(?:\r?\n|,|;| {3,}|$)/i;
/**
 * Bank reference letters commonly say "at the request of our client X" or
 * "we confirm that X is our client". Capture X (up to company suffix).
 */
const CLIENT_PHRASE_RE =
  /(?:at\s+the\s+request\s+of\s+our\s+client|we\s+(?:hereby\s+)?confirm\s+that|our\s+client(?:\s+is)?|this\s+is\s+to\s+certify\s+that)\s+([A-Z][A-Za-z0-9&\-'\.]+(?:\s+[A-Za-z0-9&\-'\.]+){0,6}?(?:\s+(?:B\.?V\.?|Ltd\.?|Limited|LLC|Inc\.?|Corp\.?|GmbH|S\.?A\.?|S\.?L\.?|S\.?R\.?L\.?|Co\.?|Company|Pty\.?|AG|N\.?V\.?))?)\b/i;

/**
 * Bank-name tokens that strongly suggest the "name" belongs to a bank,
 * not the account holder. Case-insensitive match against the candidate.
 */
const BANK_TOKENS_RE =
  /\b(BANK|BANCO|BANQUE|銀行|ABN[\s-]?AMRO|AMRO|HSBC|CITI(?:BANK)?|CHASE|BARCLAYS|DEUTSCHE|STANDARD\s+CHARTERED|SANTANDER|BNP\s+PARIBAS|BNP|CREDIT\s+SUISSE|COMMERZ|SOCIETE|ING\b|RABO|RABOBANK|UBS|MIZUHO|MUFG|SMBC|CTBC|CATHAY|MEGA|ESUN|FUBON|SHIN\s+KONG|TAISHIN|SINOPAC|CHINA\s+TRUST|TAIWAN\s+BUSINESS|FIRST\s+COMMERCIAL|SUMITOMO|NORDEA|DNB|SEB|HANDELS|DANSKE|CAIXA)\b/i;

const BANK_ADDRESS_HINT_RE =
  /\b(Branch|Head\s+Office|HQ|Correspondent|SWIFT\s+Code|Bank\s+Address)\b/i;

export function isBankName(name: string): boolean {
  return BANK_TOKENS_RE.test(name);
}

const DATE_RE_PATTERNS: RegExp[] = [
  /\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/, // 2026-05-07
  /\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\b/, // 07/05/2026
  /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
];
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function toIsoDate(yyyy: number, mm: number, dd: number): string | undefined {
  if (yyyy < 1990 || yyyy > 2100) return undefined;
  if (mm < 1 || mm > 12) return undefined;
  if (dd < 1 || dd > 31) return undefined;
  const m = String(mm).padStart(2, '0');
  const d = String(dd).padStart(2, '0');
  return `${yyyy}-${m}-${d}`;
}

function extractDate(text: string): string | undefined {
  for (const re of DATE_RE_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    if (re === DATE_RE_PATTERNS[0]) {
      return toIsoDate(+m[1], +m[2], +m[3]);
    }
    if (re === DATE_RE_PATTERNS[1]) {
      return toIsoDate(+m[3], +m[2], +m[1]);
    }
    if (re === DATE_RE_PATTERNS[2]) {
      const mon = MONTHS[m[2].toLowerCase()];
      return toIsoDate(+m[3], mon, +m[1]);
    }
  }
  return undefined;
}

function extractAddressCandidates(text: string): AddressCandidate[] {
  const out: AddressCandidate[] = [];
  const lines = text.split(/\r?\n|(?<=\.)\s{2,}/);
  const markers =
    /(Road|Rd\.?|Street|St\.?|Avenue|Ave\.?|Lane|Ln\.?|Alley|District|City|Building|Floor|Fl\.?|Room|Rm\.?|No\.|Postbus|Postcode|Amsterdam|Rotterdam|Taipei|Hong Kong|Taiwan|Netherlands)/i;
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length < 10 || trimmed.length > 200) continue;
    if (!markers.test(trimmed)) continue;
    if (!/[,#]|\d/.test(trimmed)) continue;

    if (seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());

    // Look up to 3 lines above for a bank-context hint
    const ctxStart = Math.max(0, i - 3);
    const ctx = lines.slice(ctxStart, i + 1).join(' ');
    const likelyBankAddress =
      BANK_TOKENS_RE.test(ctx) || BANK_ADDRESS_HINT_RE.test(ctx);

    out.push({ value: trimmed, likelyBankAddress });
    if (out.length >= 6) break;
  }
  return out;
}

function extractNameCandidates(text: string): NameCandidate[] {
  const out: NameCandidate[] = [];
  const seen = new Set<string>();

  const pushIfValid = (name: string) => {
    const v = name.replace(/\s+/g, ' ').trim();
    if (v.length < 3 || v.length > 80) return;
    if (seen.has(v.toUpperCase())) return;
    // Skip obvious non-names (all caps words common in bank letters)
    if (
      /^(PDF|UTC|EUR|USD|GBP|ACCOUNT|STATEMENT|CERTIFIED|LETTER|DATE|ADDRESS|NUMBER|HOLDER|REGISTERED|LIMITED|IBAN|BIC|SWIFT|TOTAL|BALANCE|TRANSACTION|REFERENCE|SUBJECT|DEAR|SINCERELY|CONFIRM|HEREBY|WHOM|CONCERN|KIND|REGARDS|YOURS|FAITHFULLY|TRULY|THE|AND|FOR|BANK|REFERENCE)$/i.test(
        v,
      )
    )
      return;
    seen.add(v.toUpperCase());
    out.push({ value: v, likelyBank: isBankName(v) });
  };

  // ALL-CAPS word sequences (company logos, upper-case names)
  const upperRe = /\b([A-Z][A-Z0-9&\-'\.]{1,}(?:\s+[A-Z][A-Z0-9&\-'\.]{1,}){1,5})\b/g;
  let m: RegExpExecArray | null;
  while ((m = upperRe.exec(text)) !== null) {
    pushIfValid(m[1]);
    if (out.length >= 12) break;
  }

  // Mixed-case Title Case sequences followed by company suffix
  // e.g. "Nuna International B.V"  "Wonderland Co., Ltd"
  const mixedRe =
    /\b([A-Z][a-zA-Z0-9&\-']+(?:\s+[A-Z][a-zA-Z0-9&\-']+){0,5}\s+(?:B\.?V\.?|Ltd\.?|Limited|LLC|Inc\.?|Corp\.?|GmbH|S\.?A\.?|S\.?L\.?|S\.?R\.?L\.?|Co\.?,?\s*Ltd\.?|Co\.?|Company|Pty\.?\s*Ltd\.?|AG|N\.?V\.?))\b/g;
  while ((m = mixedRe.exec(text)) !== null) {
    pushIfValid(m[1]);
    if (out.length >= 15) break;
  }

  return out;
}

export function extractFields(rawText: string): ExtractedFields {
  const text = rawText.replace(/\u00A0/g, ' ');

  // ----- IBAN -----
  const ibanMatch = text.match(IBAN_RE);
  const iban = ibanMatch?.[0]?.replace(/\s+/g, '').toUpperCase();

  // ----- BIC / SWIFT -----
  const bicMatch = text.match(BIC_RE);
  const bic = bicMatch?.find((b) => !/^(UNITED|ACCOUNT|BALANCE|NUMBER)$/.test(b));

  // ----- Tax ID -----
  const taxMatches = [...text.matchAll(TAX_ID_RE)].map((m) => m[1]);
  const taiwanTaxId =
    taxMatches.find(
      (d) => /統一編號|Tax\s*ID|Unif(?:ied)?\s*(?:Business|Tax)/i.test(text) && d.length === 8,
    ) ?? undefined;

  // ----- Account number -----
  const acctMatch = text.match(ACCT_NO_RE);
  const accountNumber = acctMatch?.[1]?.replace(/\s+/g, '');

  // ----- Dates -----
  const issueDate = extractDate(text);

  // ----- Candidates -----
  const nameCandidates = extractNameCandidates(text);
  const addressCandidates = extractAddressCandidates(text);

  // ----- Best guesses -----
  // 1. Prefer explicit "Account Holder: X" label
  let accountHolder: string | undefined = text.match(HOLDER_RE)?.[1]?.trim();

  // 2. Bank letters: "at the request of our client X" / "we confirm that X"
  if (!accountHolder) {
    const phraseMatch = text.match(CLIENT_PHRASE_RE);
    if (phraseMatch) {
      const candidate = phraseMatch[1].trim();
      if (!isBankName(candidate)) {
        accountHolder = candidate;
      }
    }
  }

  // 3. Otherwise first name candidate that's NOT a bank name
  if (!accountHolder) {
    const nonBank = nameCandidates.find((n) => !n.likelyBank);
    accountHolder = nonBank?.value;
  }

  // Best address: first candidate NOT flagged as bank context
  const nonBankAddr = addressCandidates.find((a) => !a.likelyBankAddress);
  const bestAddress = nonBankAddr?.value;

  return {
    accountHolder,
    nameCandidates,
    iban,
    bic,
    accountNumber,
    issueDate,
    bestAddress,
    addressCandidates,
    taiwanTaxId,
  };
}

// ---------- Document-type-specific checks ----------

export type DocType =
  | 'bank_statement'
  | 'company_registration'
  | 'proof_of_address'
  | 'id'
  | 'unknown';

export function guessDocType(text: string): DocType {
  const t = text.toLowerCase();
  const hasBank = /(bank\s+statement|bank\s+reference|certified\s+bank\s+letter|iban|swift|bic|對帳單|銀行)/i.test(text);
  const hasCompany = /(company\s+registration|statutory\s+registration|incorporation|設立登記|公司登記)/i.test(text);
  const hasPoa = /(utility|electricity|water|telecom|mobile|gas\s+bill|phone\s+bill|水電|電信)/i.test(text);
  const hasId = /(identity\s+card|passport|身分證|護照)/i.test(t) && !hasBank;
  if (hasCompany) return 'company_registration';
  if (hasBank) return 'bank_statement';
  if (hasPoa) return 'proof_of_address';
  if (hasId) return 'id';
  return 'unknown';
}

export interface FindingItem {
  level: 'ok' | 'warn' | 'fail';
  titleKey: string;
  detail?: string;
}

export function buildFindings(
  docType: DocType,
  fields: ExtractedFields,
  rawText: string,
  nowIso = new Date().toISOString().slice(0, 10),
): FindingItem[] {
  const findings: FindingItem[] = [];

  // ----- Date freshness -----
  if (fields.issueDate) {
    const ageDays = daysBetween(fields.issueDate, nowIso);
    if (ageDays < 0) {
      findings.push({
        level: 'warn',
        titleKey: 'docFindingDateFuture',
        detail: fields.issueDate,
      });
    } else if (ageDays <= 90) {
      findings.push({
        level: 'ok',
        titleKey: 'docFindingDateOk',
        detail: `${fields.issueDate} · ${ageDays}d`,
      });
    } else if (ageDays <= 180 && docType === 'bank_statement') {
      findings.push({
        level: 'warn',
        titleKey: 'docFindingDateWithin180',
        detail: `${fields.issueDate} · ${ageDays}d`,
      });
    } else {
      findings.push({
        level: 'fail',
        titleKey: 'docFindingDateStale',
        detail: `${fields.issueDate} · ${ageDays}d`,
      });
    }
  } else {
    findings.push({ level: 'warn', titleKey: 'docFindingDateMissing' });
  }

  // ----- Document-type specific -----
  if (docType === 'bank_statement') {
    findings.push(
      fields.iban
        ? { level: 'ok', titleKey: 'docFindingIbanOk', detail: fields.iban }
        : { level: 'warn', titleKey: 'docFindingIbanMissing' },
    );
    if (fields.accountHolder) {
      findings.push({
        level: 'ok',
        titleKey: 'docFindingHolderOk',
        detail: fields.accountHolder,
      });
    } else if (fields.nameCandidates.every((n) => n.likelyBank)) {
      findings.push({ level: 'fail', titleKey: 'docFindingHolderOnlyBank' });
    } else {
      findings.push({ level: 'fail', titleKey: 'docFindingHolderMissing' });
    }
    findings.push(
      fields.bestAddress
        ? { level: 'ok', titleKey: 'docFindingAddressOk', detail: fields.bestAddress }
        : { level: 'warn', titleKey: 'docFindingAddressMissing' },
    );
  }

  if (docType === 'company_registration') {
    findings.push(
      fields.taiwanTaxId
        ? { level: 'ok', titleKey: 'docFindingTaxIdOk', detail: fields.taiwanTaxId }
        : { level: 'warn', titleKey: 'docFindingTaxIdMissing' },
    );
    findings.push(
      fields.accountHolder
        ? { level: 'ok', titleKey: 'docFindingCompanyNameOk', detail: fields.accountHolder }
        : { level: 'warn', titleKey: 'docFindingCompanyNameMissing' },
    );
    findings.push(
      fields.bestAddress
        ? { level: 'ok', titleKey: 'docFindingAddressOk', detail: fields.bestAddress }
        : { level: 'warn', titleKey: 'docFindingAddressMissing' },
    );
  }

  if (docType === 'proof_of_address') {
    findings.push(
      fields.bestAddress
        ? { level: 'ok', titleKey: 'docFindingAddressOk', detail: fields.bestAddress }
        : { level: 'fail', titleKey: 'docFindingAddressMissing' },
    );
    if (fields.bestAddress) {
      const addr = fields.bestAddress;
      const hasFormat = /Room|Rm\.?|Building|Bldg|#\s*\d|No\.\s*\d/i.test(addr);
      findings.push(
        hasFormat
          ? { level: 'ok', titleKey: 'docFindingAddressFormatOk' }
          : { level: 'warn', titleKey: 'docFindingAddressFormatWeak', detail: addr },
      );
    }
  }

  if (docType === 'unknown') {
    findings.push({ level: 'warn', titleKey: 'docFindingUnknownType' });
  }

  if (rawText.trim().length < 80) {
    findings.push({ level: 'warn', titleKey: 'docFindingLowText' });
  }

  return findings;
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ---------- Cross-document consistency ----------

export interface CrossCheckFinding {
  level: 'ok' | 'warn' | 'fail';
  titleKey: string;
  detail?: string;
}

export function crossCheck(
  docs: { docType: DocType; fields: ExtractedFields }[],
): CrossCheckFinding[] {
  const out: CrossCheckFinding[] = [];
  if (docs.length < 2) return out;

  const names = docs
    .map((d) => (d.fields.accountHolder ?? '').trim().toUpperCase())
    .filter(Boolean);

  const uniqueNames = Array.from(new Set(names));
  if (uniqueNames.length === 1 && names.length >= 2) {
    out.push({ level: 'ok', titleKey: 'docCrossNameMatch', detail: uniqueNames[0] });
  } else if (uniqueNames.length > 1) {
    const [a, b] = [uniqueNames[0], uniqueNames[1]];
    const d = editDistance(a, b);
    if (d <= 2) {
      out.push({
        level: 'warn',
        titleKey: 'docCrossNameMinorDiff',
        detail: `${a}  ⟷  ${b}`,
      });
    } else {
      out.push({
        level: 'fail',
        titleKey: 'docCrossNameMismatch',
        detail: `${a}  ⟷  ${b}`,
      });
    }
  }

  const firstAddresses = docs.map((d) => normalizeAddress(d.fields.bestAddress ?? ''));
  const nonEmpty = firstAddresses.filter(Boolean);
  if (nonEmpty.length >= 2) {
    const unique = Array.from(new Set(nonEmpty));
    if (unique.length === 1) {
      out.push({ level: 'ok', titleKey: 'docCrossAddressMatch' });
    } else {
      out.push({
        level: 'warn',
        titleKey: 'docCrossAddressDiff',
        detail: unique.slice(0, 2).join('  ⟷  '),
      });
    }
  }

  return out;
}

function normalizeAddress(s: string): string {
  return s
    .toLowerCase()
    .replace(/[,.#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0 || n === 0) return m + n;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}
