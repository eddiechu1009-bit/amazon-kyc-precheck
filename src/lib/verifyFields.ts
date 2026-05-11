/**
 * Field-verification engine (Module 2, v2 architecture).
 *
 * The seller types each required field value (holder name, IBAN, address etc.),
 * then uploads the document. Instead of TRYING to extract fields from OCR —
 * which proved unreliable on real scanned documents — we simply CHECK whether
 * the seller-provided value appears in the document's OCR text.
 *
 * This inverts the problem: we are not guessing, we are verifying.
 *
 * All matching runs locally on the seller's device.
 */

// ---------- Types ----------

export type FieldKind =
  | 'text' // Free-form text: name, company, city
  | 'iban' // IBAN (whitespace stripped, checksum validated)
  | 'address' // Address (looser matching across line breaks)
  | 'date' // ISO YYYY-MM-DD, also check age
  | 'number' // Generic numeric ID
  | 'tax_id'; // Taiwan 8-digit tax ID etc.

export interface FieldSpec {
  /** Stable id, e.g. 'holder_name', used to key into results */
  id: string;
  /** Short label shown to the seller (ZH / EN handled by the UI) */
  labelZh: string;
  labelEn: string;
  kind: FieldKind;
  /** Is this field required for this document type? */
  required: boolean;
  /** Helper hint under the input (optional) */
  hintZh?: string;
  hintEn?: string;
  /** Validate the input before matching (e.g. IBAN format). Returns undefined if ok. */
  validate?: (value: string) => string | undefined;
  /** Placeholder in the input */
  placeholderZh?: string;
  placeholderEn?: string;
}

export interface VerifyFinding {
  level: 'ok' | 'warn' | 'fail' | 'skipped';
  /** Translation key(s) the UI can render */
  titleKey: string;
  /** Any extra detail for display */
  detail?: string;
  /** Context snippet from the OCR text (for 'found' type findings) */
  snippet?: string;
  /** If a near-but-not-exact match was found, show what we saw */
  nearMatch?: string;
}

export interface VerifyFieldResult {
  fieldId: string;
  value: string;
  findings: VerifyFinding[];
}

export interface VerifyReport {
  fields: VerifyFieldResult[];
  /** Overall score 0-100 for a single-line summary */
  scorePct: number;
  /** Aggregate counters */
  okCount: number;
  warnCount: number;
  failCount: number;
}

// ---------- Document type library ----------

export type DocType =
  | 'bank_letter'
  | 'company_registration'
  | 'proof_of_address'
  | 'id_document'
  | 'generic';

export interface DocTypeDef {
  id: DocType;
  titleZh: string;
  titleEn: string;
  /** Emoji / icon for the picker */
  icon: string;
  /** Short description */
  descZh: string;
  descEn: string;
  /** Required / optional fields, in input order */
  fields: FieldSpec[];
}

// -- Shared field specs --

const ibanField: FieldSpec = {
  id: 'iban',
  labelZh: 'IBAN / 銀行帳號',
  labelEn: 'IBAN / bank account number',
  kind: 'iban',
  required: true,
  placeholderZh: 'e.g. NL58 ABNA 0567 0865 42',
  placeholderEn: 'e.g. NL58 ABNA 0567 0865 42',
  hintZh: '可以留空格,會自動清理',
  hintEn: 'Spaces OK, will be stripped',
  validate: (v) => {
    const cleaned = v.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 8) return 'Too short';
    if (!/^[A-Z0-9]+$/.test(cleaned)) return 'Only letters and digits';
    return undefined;
  },
};

const issueDateField: FieldSpec = {
  id: 'issue_date',
  labelZh: '開立日期 (YYYY-MM-DD)',
  labelEn: 'Issue date (YYYY-MM-DD)',
  kind: 'date',
  required: true,
  placeholderZh: '2026-04-28',
  placeholderEn: '2026-04-28',
  hintZh: '文件上的日期,對帳單 / 證明信 / 帳單都需要',
  hintEn: 'The date on the document itself',
  validate: (v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Format YYYY-MM-DD';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return 'Invalid date';
    return undefined;
  },
};

const holderNameField: FieldSpec = {
  id: 'holder_name',
  labelZh: '帳戶持有人姓名 / 公司全名',
  labelEn: 'Account holder / company full name',
  kind: 'text',
  required: true,
  placeholderZh: 'e.g. NUNA International B.V.',
  placeholderEn: 'e.g. NUNA International B.V.',
  hintZh: '和 Seller Central 後台登記的名稱完全一致',
  hintEn: 'Must match exactly what is in Seller Central',
};

const holderAddressField: FieldSpec = {
  id: 'holder_address',
  labelZh: '持有人居住地址',
  labelEn: 'Holder residential address',
  kind: 'address',
  required: true,
  placeholderZh: 'e.g. Room 02, 8F., No. 433 Ruiguang Rd., Neihu Dist., Taipei',
  placeholderEn: 'e.g. Room 02, 8F., No. 433 Ruiguang Rd., Neihu Dist., Taipei',
  hintZh: '英文地址為準,要與後台完全一致',
  hintEn: 'English address exactly as in Seller Central',
};

const companyEnField: FieldSpec = {
  id: 'company_en',
  labelZh: '公司英文名稱',
  labelEn: 'Company English name',
  kind: 'text',
  required: true,
  placeholderZh: 'e.g. Wonderland International Co., Ltd.',
  placeholderEn: 'e.g. Wonderland International Co., Ltd.',
};

const companyRegAddressField: FieldSpec = {
  id: 'company_address',
  labelZh: '公司登記地址',
  labelEn: 'Registered company address',
  kind: 'address',
  required: true,
};

const taxIdField: FieldSpec = {
  id: 'tax_id',
  labelZh: '統一編號 / 稅籍號碼 (台灣 8 碼)',
  labelEn: 'Tax ID (Taiwan 8-digit)',
  kind: 'tax_id',
  required: false,
  validate: (v) => {
    if (!/^\d{8}$/.test(v)) return '8 digits';
    return undefined;
  },
};

const boNameField: FieldSpec = {
  id: 'bo_name',
  labelZh: '受益人 / 法人代表英文姓名',
  labelEn: 'Beneficial owner / legal rep English name',
  kind: 'text',
  required: true,
  hintZh: '姓名拼音,要與身分證 / 公司登記拼法完全一致',
  hintEn: 'Romanized name matching ID and company registration',
};

// -- Document types --

export const docTypes: DocTypeDef[] = [
  {
    id: 'bank_letter',
    titleZh: '銀行證明信 / 對帳單',
    titleEn: 'Bank certified letter / statement',
    icon: '🏦',
    descZh: '要驗證的是:持有人、IBAN、地址、日期、銀行名稱',
    descEn: 'Verifies holder name, IBAN, address, date, bank name',
    fields: [
      holderNameField,
      ibanField,
      holderAddressField,
      issueDateField,
      {
        id: 'bank_name',
        labelZh: '銀行全名',
        labelEn: 'Bank full name',
        kind: 'text',
        required: true,
        placeholderZh: 'e.g. ABN AMRO Bank',
        placeholderEn: 'e.g. ABN AMRO Bank',
        hintZh: '文件上有沒有出現銀行正式名稱',
        hintEn: 'Whether the bank name appears on the document',
      },
    ],
  },
  {
    id: 'company_registration',
    titleZh: '公司設立登記 / 登記抄本',
    titleEn: 'Company registration / extract',
    icon: '🏢',
    descZh: '要驗證的是:公司英文名、統編、登記地址、董事 / 法人',
    descEn: 'Verifies company English name, tax ID, registered address, director',
    fields: [
      companyEnField,
      taxIdField,
      companyRegAddressField,
      boNameField,
      issueDateField,
    ],
  },
  {
    id: 'proof_of_address',
    titleZh: '地址證明 (POA) — 水電 / 電信 / 銀行帳單',
    titleEn: 'Proof of Address — utility / telecom / bank bill',
    icon: '📮',
    descZh: '要驗證的是:持有人、居住地址、開立日期(90 天內)',
    descEn: 'Verifies holder name, address, issue date (within 90 days)',
    fields: [holderNameField, holderAddressField, issueDateField],
  },
  {
    id: 'id_document',
    titleZh: '身分證 / 護照',
    titleEn: 'ID / passport',
    icon: '🪪',
    descZh: '要驗證的是:姓名拼音、證件號碼、有效期',
    descEn: 'Verifies name romanization, ID number, expiry date',
    fields: [
      {
        id: 'id_name',
        labelZh: '證件上的英文姓名',
        labelEn: 'English name on the ID',
        kind: 'text',
        required: true,
      },
      {
        id: 'id_number',
        labelZh: '證件號碼',
        labelEn: 'ID / passport number',
        kind: 'number',
        required: true,
      },
      {
        id: 'id_expiry',
        labelZh: '有效期 (YYYY-MM-DD)',
        labelEn: 'Expiry date (YYYY-MM-DD)',
        kind: 'date',
        required: true,
      },
    ],
  },
  {
    id: 'generic',
    titleZh: '其他 — 自由欄位',
    titleEn: 'Other — free fields',
    icon: '📄',
    descZh: '自己決定要驗證哪些欄位',
    descEn: 'You define the fields to verify',
    fields: [
      { ...holderNameField, required: false },
      { ...holderAddressField, required: false },
      { ...issueDateField, required: false },
    ],
  },
];

export const docTypeById = new Map(docTypes.map((d) => [d.id, d]));

// ---------- Text normalization ----------

function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:#'"\-_/\\()\[\]{}]+/g, ' ') // strip light punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function containsChinese(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s);
}

/**
 * Damerau-Levenshtein distance capped at maxDist (early return for speed).
 */
function editDistance(a: string, b: string, maxDist = 4): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > maxDist) return maxDist + 1;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Split a haystack into candidate windows of roughly target length */
function candidateWindows(haystack: string, needleLen: number, step = 1): string[] {
  if (haystack.length <= needleLen) return [haystack];
  const windows: string[] = [];
  // Use a range of widths ±20% to tolerate minor length drift
  const widths = [needleLen, Math.max(4, Math.floor(needleLen * 0.85)), Math.ceil(needleLen * 1.15)];
  for (const w of widths) {
    if (w > haystack.length) continue;
    for (let i = 0; i + w <= haystack.length; i += step) {
      windows.push(haystack.slice(i, i + w));
    }
  }
  return windows;
}

/**
 * Find the closest substring in haystack to needle.
 * Returns { distance, match } where distance is Damerau-Levenshtein.
 */
function findClosestSubstring(
  haystack: string,
  needle: string,
  maxDist = 4,
): { distance: number; match: string } | undefined {
  if (!needle) return undefined;
  // Quick path: exact substring present
  if (haystack.includes(needle)) return { distance: 0, match: needle };
  // Scan windows
  const windows = candidateWindows(haystack, needle.length, Math.max(1, Math.floor(needle.length / 8)));
  let best: { distance: number; match: string } | undefined;
  for (const w of windows) {
    const d = editDistance(w, needle, maxDist);
    if (d <= maxDist && (!best || d < best.distance)) {
      best = { distance: d, match: w };
      if (d === 0) break;
    }
  }
  return best;
}

// ---------- Matching primitives ----------

export interface MatchOutcome {
  kind: 'exact' | 'near' | 'missing';
  /** Distance on normalized strings (0 for exact) */
  distance?: number;
  /** The surrounding text from the OCR, for display */
  snippet?: string;
  /** The fuzzy-matched substring in the OCR, for display */
  nearMatch?: string;
}

/**
 * Check if a value appears in the OCR text.
 * Uses normalized comparison (case/spacing/punctuation-insensitive).
 * Falls back to fuzzy matching for minor OCR errors.
 */
function matchValue(ocrText: string, value: string, tolerance = 'medium' as 'strict' | 'medium' | 'loose'): MatchOutcome {
  if (!value.trim()) return { kind: 'missing' };
  const haystack = normalize(ocrText);
  const needle = normalize(value);

  // Exact substring match?
  if (haystack.includes(needle)) {
    const idx = haystack.indexOf(needle);
    const start = Math.max(0, idx - 30);
    const end = Math.min(haystack.length, idx + needle.length + 30);
    return {
      kind: 'exact',
      distance: 0,
      snippet: `…${haystack.slice(start, end)}…`,
    };
  }

  // Fuzzy: compute max distance from tolerance
  const baseMax = tolerance === 'strict' ? 1 : tolerance === 'loose' ? 5 : 3;
  const scaled = Math.min(baseMax + Math.floor(needle.length / 18), 8);

  // Chinese text: skip fuzzy (character-level edit distance is unreliable for CJK)
  if (containsChinese(needle)) {
    return { kind: 'missing' };
  }

  const closest = findClosestSubstring(haystack, needle, scaled);
  if (closest && closest.distance <= scaled) {
    return {
      kind: 'near',
      distance: closest.distance,
      nearMatch: closest.match,
    };
  }

  return { kind: 'missing' };
}

/**
 * IBAN-specific match: normalize both to uppercase alphanumerics, then exact compare
 * and also validate the ISO 13616 checksum on what the seller typed.
 */
function matchIban(ocrText: string, value: string): MatchOutcome {
  const normalizeIban = (s: string) => s.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const cleanedNeedle = normalizeIban(value);
  const cleanedHaystack = normalizeIban(ocrText);

  if (!cleanedNeedle) return { kind: 'missing' };
  if (cleanedHaystack.includes(cleanedNeedle)) {
    return { kind: 'exact', distance: 0, snippet: cleanedNeedle };
  }

  // Fuzzy tolerance 1 (OCR commonly confuses 0/O, 1/I, 5/S)
  const d = findClosestSubstring(cleanedHaystack, cleanedNeedle, 2);
  if (d) {
    return { kind: 'near', distance: d.distance, nearMatch: d.match };
  }
  return { kind: 'missing' };
}

/** ISO 13616 IBAN checksum validation (mod-97) */
export function isValidIbanChecksum(iban: string): boolean {
  const cleaned = iban.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length < 8 || !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  // Convert letters to numbers: A=10 ... Z=35
  let numeric = '';
  for (const ch of rearranged) {
    numeric += /\d/.test(ch) ? ch : (ch.charCodeAt(0) - 55).toString();
  }
  // Big-number mod 97 via chunking
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder.toString() + numeric.slice(i, i + 7);
    remainder = Number(BigInt(chunk) % 97n);
  }
  return remainder === 1;
}

// ---------- Per-field verification ----------

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function verifyOneField(
  field: FieldSpec,
  value: string,
  ocrText: string,
  docType: DocType,
  nowIso = new Date().toISOString().slice(0, 10),
): VerifyFieldResult {
  const findings: VerifyFinding[] = [];
  const trimmed = value.trim();

  // Empty check
  if (!trimmed) {
    if (field.required) {
      findings.push({ level: 'fail', titleKey: 'verifyEmptyRequired' });
    } else {
      findings.push({ level: 'skipped', titleKey: 'verifySkippedOptional' });
    }
    return { fieldId: field.id, value: trimmed, findings };
  }

  // Format validation
  const formatErr = field.validate?.(trimmed);
  if (formatErr) {
    findings.push({ level: 'fail', titleKey: 'verifyFormatError', detail: formatErr });
    return { fieldId: field.id, value: trimmed, findings };
  }

  // Kind-specific extra checks
  if (field.kind === 'iban' && !isValidIbanChecksum(trimmed)) {
    findings.push({
      level: 'warn',
      titleKey: 'verifyIbanChecksumFail',
      detail: trimmed.replace(/\s+/g, ''),
    });
  }

  if (field.kind === 'date') {
    const ageDays = daysBetween(trimmed, nowIso);
    if (ageDays < 0) {
      findings.push({ level: 'warn', titleKey: 'verifyDateFuture', detail: `${trimmed} · ${-ageDays}d` });
    } else {
      // 90-day green, 180-day warn (BAV only), otherwise fail
      const is180Ok = docType === 'bank_letter' && ageDays <= 180;
      if (ageDays <= 90) {
        findings.push({ level: 'ok', titleKey: 'verifyDateOk', detail: `${trimmed} · ${ageDays}d` });
      } else if (is180Ok) {
        findings.push({ level: 'warn', titleKey: 'verifyDateBavOnly', detail: `${trimmed} · ${ageDays}d` });
      } else {
        findings.push({ level: 'fail', titleKey: 'verifyDateStale', detail: `${trimmed} · ${ageDays}d` });
      }
    }
  }

  // Does this value appear in the OCR text?
  const outcome = field.kind === 'iban' ? matchIban(ocrText, trimmed) : matchValue(ocrText, trimmed);

  if (outcome.kind === 'exact') {
    findings.push({
      level: 'ok',
      titleKey: 'verifyFoundExact',
      snippet: outcome.snippet,
    });
  } else if (outcome.kind === 'near') {
    findings.push({
      level: 'warn',
      titleKey: 'verifyFoundNear',
      nearMatch: outcome.nearMatch,
      detail: `~${outcome.distance} chars`,
    });
  } else {
    findings.push({ level: 'fail', titleKey: 'verifyNotFound' });
  }

  return { fieldId: field.id, value: trimmed, findings };
}

export function verifyAgainstOcr(
  docType: DocType,
  values: Record<string, string>,
  ocrText: string,
): VerifyReport {
  const def = docTypeById.get(docType);
  if (!def) {
    return { fields: [], scorePct: 0, okCount: 0, warnCount: 0, failCount: 0 };
  }
  const results: VerifyFieldResult[] = def.fields.map((f) =>
    verifyOneField(f, values[f.id] ?? '', ocrText, docType),
  );

  let ok = 0, warn = 0, fail = 0;
  for (const r of results) {
    // Use the most severe finding for counters (per-field summary)
    const worst = r.findings.reduce<'ok' | 'warn' | 'fail' | 'skipped'>((acc, f) => {
      const order = { ok: 0, warn: 1, fail: 2, skipped: -1 } as const;
      return order[f.level] > order[acc] ? f.level : acc;
    }, 'skipped');
    if (worst === 'ok') ok++;
    else if (worst === 'warn') warn++;
    else if (worst === 'fail') fail++;
  }
  const total = ok + warn + fail;
  const scorePct = total === 0 ? 0 : Math.round((ok * 100 + warn * 50) / total);

  return { fields: results, scorePct, okCount: ok, warnCount: warn, failCount: fail };
}

// ---------- Cross-document consistency ----------

export interface CrossDocFinding {
  level: 'ok' | 'warn' | 'fail';
  titleKey: string;
  detail?: string;
}

/**
 * When multiple documents are verified, the seller's typed values should be
 * consistent across them (same holder name, same address, etc).
 * Since the seller TYPED the values, mismatches indicate either (a) they have
 * inconsistent info across their own records — which IS the KYC risk — or
 * (b) a typo in one form.
 */
export function crossCheck(
  docs: Array<{ docType: DocType; values: Record<string, string> }>,
): CrossDocFinding[] {
  const out: CrossDocFinding[] = [];
  if (docs.length < 2) return out;

  const pick = (id: string) =>
    docs.map((d) => (d.values[id] ?? '').trim()).filter(Boolean);

  // Name consistency (holder_name, company_en, bo_name, id_name all count as a "name")
  const nameIds = ['holder_name', 'company_en', 'bo_name', 'id_name'];
  const names: string[] = [];
  for (const id of nameIds) names.push(...pick(id));
  if (names.length >= 2) {
    const uniq = Array.from(new Set(names.map((n) => normalize(n))));
    if (uniq.length === 1) {
      out.push({ level: 'ok', titleKey: 'crossNameMatch' });
    } else {
      const [a, b] = uniq;
      const d = editDistance(a, b, 8);
      if (d <= 2) {
        out.push({
          level: 'warn',
          titleKey: 'crossNameMinorDiff',
          detail: `${names[0]}  ⟷  ${names.find((x) => normalize(x) !== uniq[0])}`,
        });
      } else {
        out.push({
          level: 'fail',
          titleKey: 'crossNameMismatch',
          detail: uniq.slice(0, 2).join('  ⟷  '),
        });
      }
    }
  }

  // Address consistency
  const addressIds = ['holder_address', 'company_address'];
  const addrs: string[] = [];
  for (const id of addressIds) addrs.push(...pick(id));
  if (addrs.length >= 2) {
    const uniq = Array.from(new Set(addrs.map((a) => normalize(a))));
    if (uniq.length === 1) {
      out.push({ level: 'ok', titleKey: 'crossAddressMatch' });
    } else {
      out.push({ level: 'warn', titleKey: 'crossAddressDiff', detail: uniq.slice(0, 2).join('  ⟷  ') });
    }
  }

  return out;
}
