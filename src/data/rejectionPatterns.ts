import type { Bilingual, Source } from './types';
import { loadOverrides, type CustomOverride } from './customRules';

// ============================================================
// Classifies a pasted Amazon rejection / verification failure message
// and produces: category, likely causes, next steps, response draft.
//
// Patterns are derived from the official Amazon Seller Support
// boilerplate language we observed in real cases. See
// .kiro/steering/source-attribution.md — this module only emits
// 'official' + 'experience' sources.
// ============================================================

export type RejectionCategory =
  | 'bav_document_authenticity'
  | 'bav_document_missing_fields'
  | 'name_mismatch'
  | 'kyc_document_quality'
  | 'info_change_reverification'
  | 'bo_incomplete'
  | 'address_inconsistency'
  | 'unknown';

export interface MatchPattern {
  /** Regex (case-insensitive, multiline). */
  regex: RegExp;
  /** Points added to this category if matched. */
  weight: number;
}

export interface CategoryDef {
  id: RejectionCategory;
  title: Bilingual;
  summary: Bilingual;
  /** Patterns that, if seen in the pasted message, strongly indicate this category */
  patterns: MatchPattern[];
  /** Likely root causes to show the seller */
  causes: Bilingual[];
  /** Ordered next steps — most important first */
  nextSteps: Bilingual[];
  /** Public sources backing the advice (official Amazon page or anonymized pattern obs) */
  sources: Source[];
}

// -------------------- Shared sources --------------------

const SRC_BAV_HELP: Source = {
  type: 'official',
  label: {
    zh: 'Amazon Seller Central — Bank Account Verification 文件要求',
    en: 'Amazon Seller Central — Bank Account Verification document requirements',
  },
  url: 'https://sellercentral.amazon.co.uk/help/hub/reference/external/G201200780',
  retrievedAt: '2026-05-07',
  note: {
    zh: 'Amazon 官方 Help page，列出 BAV 所需文件與格式要求。',
    en: 'Official Amazon Help page listing BAV document and format requirements.',
  },
};

const SRC_KYC_HELP: Source = {
  type: 'official',
  label: {
    zh: 'Amazon Seller Central — 身分驗證 (KYC) 要求',
    en: 'Amazon Seller Central — Identity / KYC Verification requirements',
  },
  url: 'https://sellercentral.amazon.co.uk/help/hub/reference/external/200405020',
  retrievedAt: '2026-05-07',
};

const SRC_EXPERIENCE_BAV_BOILERPLATE: Source = {
  type: 'experience',
  label: {
    zh: '近期 BAV 退件公版措辭觀察',
    en: 'Recent BAV rejection boilerplate wording observation',
  },
  note: {
    zh: '分類關鍵字取自 Amazon Seller Support 實際退件公版,未包含任何賣家識別資訊。',
    en: 'Classification keywords are derived from Amazon Seller Support rejection boilerplate; no seller-identifying data is retained.',
  },
};

const SRC_EXPERIENCE_KYC_CASES: Source = {
  type: 'experience',
  label: {
    zh: 'EU KYC 退件模式整理',
    en: 'EU KYC rejection pattern summary',
  },
  note: {
    zh: '匿名化整理多起退件案件的共通關鍵字與處理模式。',
    en: 'Anonymized summary of common keywords and handling patterns across multiple rejection cases.',
  },
};

// -------------------- Category definitions --------------------

export const categories: CategoryDef[] = [
  {
    id: 'bav_document_authenticity',
    title: {
      zh: '銀行文件真實性被質疑 (BAV)',
      en: 'Bank document authenticity questioned (BAV)',
    },
    summary: {
      zh: 'Amazon 認為你提交的銀行文件看起來被編輯過、或不是銀行原始出具版本。需要拿一份「未經編輯」的官方銀行證明信。',
      en: 'Amazon believes your bank document looks edited or is not the original bank-issued version. You need a fresh, unedited certified bank letter.',
    },
    patterns: [
      { regex: /document[s]?\s+appear\s+to\s+have\s+been\s+edited/i, weight: 10 },
      { regex: /authenticity\s+of\s+the\s+document[s]?/i, weight: 9 },
      { regex: /original[,]?\s+unedited/i, weight: 9 },
      { regex: /modified\s+rather\s+than\s+being\s+original/i, weight: 10 },
      { regex: /genuine\s+certified\s+bank\s+letter/i, weight: 8 },
      { regex: /digitally\s+added/i, weight: 7 },
      { regex: /bank\s+account\s+verification\s+has\s+failed/i, weight: 5 },
    ],
    causes: [
      {
        zh: '對帳單上有被手動加上的印章、簽名或文字(例如 Word / PDF 編輯器加的)。',
        en: 'The statement has a manually added stamp, signature, or text (e.g. inserted via Word / PDF editor).',
      },
      {
        zh: '提交的是網銀截圖或匯出 PDF,而不是銀行櫃員正式簽章的證明信。',
        en: 'Submitted an online banking screenshot or exported PDF instead of a teller-signed certified letter.',
      },
      {
        zh: '修圖遮蓋其他欄位時方式不被接受(Amazon 只允許遮餘額,其他資訊都要原樣)。',
        en: 'The way other fields were redacted is not acceptable (Amazon only allows blocking out the balance; everything else must remain original).',
      },
    ],
    nextSteps: [
      {
        zh: '親自到銀行櫃台申請「證明信 / Certified Bank Letter」,要求銀行用正本簽名(非數位簽章)。',
        en: 'Visit your bank in person and request a Certified Bank Letter with an original (non-digital) wet signature.',
      },
      {
        zh: '確認信上有:銀行名稱 + Logo、90–180 天內日期、帳戶持有人姓名、地址、帳號、銀行原始簽章或印章。',
        en: 'Confirm the letter shows: bank name + logo, issue date within 90–180 days, account holder name, address, account number, original bank signature or stamp.',
      },
      {
        zh: '絕對不要在文件上做任何編輯或加註記。需要遮的只能是帳戶餘額,其他都保留原樣。',
        en: 'Do NOT edit or annotate the document. You may only redact the account balance — leave everything else original.',
      },
      {
        zh: '回到 Seller Central → Deposit Methods 頁面,按「Retry」按鈕重新上傳。',
        en: 'Return to Seller Central → Deposit Methods and click "Retry" to re-upload.',
      },
      {
        zh: '如果銀行不願開證明信,考慮換一個願意出的銀行(不限 EU,只要收款幣別支援、持有人名符合即可)。',
        en: 'If your bank refuses, consider switching to another bank willing to issue such a letter. The bank does not need to be EU-based, as long as it supports the required currency and the holder name matches your registered business.',
      },
    ],
    sources: [SRC_BAV_HELP, SRC_EXPERIENCE_BAV_BOILERPLATE],
  },
  {
    id: 'bav_document_missing_fields',
    title: {
      zh: '銀行文件欄位不齊',
      en: 'Bank document missing required fields',
    },
    summary: {
      zh: '文件沒被質疑真實性,但缺了 Amazon 要求的欄位(例如缺地址、缺銀行 Logo、日期過舊)。',
      en: 'Authenticity not questioned, but the document is missing fields Amazon requires (e.g. no address, no bank logo, outdated issue date).',
    },
    patterns: [
      { regex: /bank\s+name\s+and\s+the\s+bank\s+logo/i, weight: 6 },
      { regex: /account\s+holder['’]?s\s+name/i, weight: 5 },
      { regex: /residential\s+address/i, weight: 6 },
      { regex: /bank\s+account\s+number/i, weight: 5 },
      { regex: /dated\s+within\s+the\s+last\s+\d+\s+days/i, weight: 8 },
      { regex: /last\s+180\s+days/i, weight: 7 },
      { regex: /last\s+90\s+days/i, weight: 7 },
    ],
    causes: [
      {
        zh: '文件日期超過 Amazon 要求的有效期(通常 90 天,BAV 可能到 180 天)。',
        en: 'Document issued outside the required window (typically 90 days, BAV up to 180 days).',
      },
      {
        zh: '缺銀行 Logo 或銀行名稱(例如純文字輸出的網銀版本)。',
        en: 'Missing bank logo or bank name (e.g. plain-text online banking export).',
      },
      {
        zh: '缺帳戶持有人的居住地址。',
        en: 'Missing account holder residential address.',
      },
      {
        zh: '缺完整銀行帳號(只有末四碼不夠)。',
        en: 'Missing full bank account number (last-4 digits alone is not enough).',
      },
    ],
    nextSteps: [
      {
        zh: '去銀行要正式開立、含以下全部要素的證明信:銀行名稱+Logo、近 180 天內日期、持有人姓名+居住地址、完整帳號、銀行原始簽章。',
        en: 'Request an official letter that includes ALL of: bank name + logo, date within the last 180 days, holder name + residential address, full account number, original bank signature.',
      },
      {
        zh: '拿回來後逐一對照 Amazon 要求清單,任何一項沒有都再去補,不要先上傳。',
        en: 'Check every field against the Amazon list before uploading — upload only once all fields are present.',
      },
      {
        zh: '上傳前用 A4 紙印出肉眼看一次,確認沒有模糊、切邊、反光的情況。',
        en: 'Print the document on A4 and eyeball it once before uploading — make sure nothing is blurry, cropped, or glared.',
      },
    ],
    sources: [SRC_BAV_HELP, SRC_EXPERIENCE_BAV_BOILERPLATE],
  },
  {
    id: 'name_mismatch',
    title: {
      zh: '帳戶持有人姓名與後台註冊名不一致',
      en: 'Account holder name does not match registered business',
    },
    summary: {
      zh: '你銀行帳戶上的名字跟 Amazon 後台的公司 / 個人名字對不上。',
      en: "The name on your bank account doesn't match the business or individual name registered in Amazon.",
    },
    patterns: [
      { regex: /account\s+holder\s+matches/i, weight: 9 },
      { regex: /does\s+not\s+match/i, weight: 7 },
      { regex: /business\s+holder\s+name/i, weight: 8 },
      { regex: /registered\s+with\s+Amazon/i, weight: 4 },
      { regex: /name\s+discrepanc(?:y|ies)/i, weight: 9 },
    ],
    causes: [
      {
        zh: '銀行帳戶是個人名,但 Amazon 後台是公司名(或反過來)。',
        en: 'Bank account is in a personal name but Amazon is registered as a company (or vice versa).',
      },
      {
        zh: '拼音版本不一致(CHIU vs. QIU、有無中間名等)。',
        en: 'Different romanization of the same name (CHIU vs. QIU, middle name included/excluded, etc).',
      },
      {
        zh: '公司名稱中有 "Ltd." / "B.V." / "Inc." 這類後綴在一邊有、另一邊沒有。',
        en: 'Entity suffixes like "Ltd." / "B.V." / "Inc." are present in one place but not the other.',
      },
    ],
    nextSteps: [
      {
        zh: '先比對兩邊的「字符」:逐字比對銀行文件上的持有人名 vs Seller Central 後台的註冊名。',
        en: 'First do a character-by-character comparison: bank document holder name vs the name registered in Seller Central.',
      },
      {
        zh: '若是拼音差異,請以官方登記文件(公司設立登記表 / 身分證)上的拼音為準,修改不一致的那一邊。',
        en: "If it's a romanization difference, align with the official registration (company registration / ID) and correct the other side.",
      },
      {
        zh: '若是個人帳戶對應公司登記,最快的解法是換用公司名義開立的銀行帳戶。',
        en: 'If the account is personal but registration is a company, the fastest fix is to use a bank account opened in the company name.',
      },
      {
        zh: '換帳戶後,Amazon 允許你用**非 EU 銀行**,只要支援收款幣別且持有人名對上即可。',
        en: 'When switching accounts, note that a non-EU bank is allowed as long as it supports the required currency and the holder name matches.',
      },
    ],
    sources: [SRC_BAV_HELP, SRC_EXPERIENCE_BAV_BOILERPLATE],
  },
  {
    id: 'kyc_document_quality',
    title: {
      zh: 'KYC 文件品質 / 資訊不清',
      en: 'KYC document quality / information unclear',
    },
    summary: {
      zh: 'Amazon 看得到你的文件,但某些欄位讀不清楚(拍糊、遮擋、光線)或資訊不完整。',
      en: 'Amazon received your document but some fields are unreadable (blurry, obstructed, glared) or the info is incomplete.',
    },
    patterns: [
      { regex: /illegible|unclear|not\s+clearly\s+visible/i, weight: 8 },
      { regex: /higher\s+(?:quality|resolution)/i, weight: 7 },
      { regex: /re[-\s]?submit/i, weight: 4 },
      { regex: /not\s+valid\s+(?:proof|document)/i, weight: 6 },
      { regex: /(?:photograph|scan)\s+(?:of\s+the\s+)?(?:entire|full|complete)/i, weight: 6 },
    ],
    causes: [
      {
        zh: '拍照反光、陰影、手指遮擋關鍵欄位。',
        en: 'Glare, shadows, or fingers covering key fields.',
      },
      {
        zh: '掃描解析度過低(<200 DPI 常被退)。',
        en: 'Scan resolution too low (<200 DPI is often rejected).',
      },
      {
        zh: '文件沒拍完整,邊角被切掉。',
        en: 'Document edges cropped off.',
      },
    ],
    nextSteps: [
      {
        zh: '改用掃描器(或手機掃描 app 如 Adobe Scan / Microsoft Lens),不要直接拍照。',
        en: 'Use a scanner or a mobile scan app (Adobe Scan / Microsoft Lens) rather than a regular phone photo.',
      },
      {
        zh: '掃描設定至少 300 DPI,輸出彩色 PDF 或 PNG。',
        en: 'Scan at 300 DPI or higher, output as color PDF or PNG.',
      },
      {
        zh: '重新提交前自己用 100% 大小檢視,每個欄位都要清楚可讀。',
        en: 'Before re-submitting, view the file at 100% zoom — every field must be clearly readable.',
      },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'info_change_reverification',
    title: {
      zh: '資訊變更觸發二次驗證',
      en: 'Re-verification triggered by information change',
    },
    summary: {
      zh: '你最近在後台改了地址 / Email / 電話 / 法人資訊,系統自動啟動 KYC 重審。',
      en: 'You recently changed address / email / phone / legal info in Seller Central, triggering an automatic KYC re-review.',
    },
    patterns: [
      { regex: /recently\s+(?:updated|changed)/i, weight: 8 },
      { regex: /information\s+update/i, weight: 6 },
      { regex: /re[-\s]?verify|re[-\s]?verification/i, weight: 7 },
      { regex: /updated\s+(?:your\s+)?account\s+information/i, weight: 8 },
    ],
    causes: [
      {
        zh: '改地址 / Email / 電話後,Amazon 要求用新的資訊重新提供 POA、銀行對帳單等證明。',
        en: 'After changing address / email / phone, Amazon requires fresh POA, bank statements etc. reflecting the new information.',
      },
      {
        zh: '更新後提交的文件仍是舊地址,被判定不一致。',
        en: 'Documents submitted after the update still show the old address, flagged as inconsistent.',
      },
    ],
    nextSteps: [
      {
        zh: '先把新地址下的水電 / 電信 / 銀行對帳單(90 天內)準備好再動後台;一旦變更就立刻上傳,避免帳號被限制銷售。',
        en: 'Gather utility / telecom / bank statements (within 90 days) showing the NEW address BEFORE making the change — upload immediately after to avoid a selling hold.',
      },
      {
        zh: '所有新提交的文件,姓名 / 公司名 / 地址都必須完全反映變更後的最新狀態。',
        en: 'Every newly submitted document must fully reflect the post-change state — name, company, address all updated.',
      },
      {
        zh: '若只是小改(同棟樓改室號),上傳「變更聲明書」加新 POA 通常比改表格更順。',
        en: 'For minor changes (unit number within the same building), uploading a change-of-address declaration alongside a new POA usually clears faster than editing the form.',
      },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'bo_incomplete',
    title: {
      zh: '受益人 (BO) 資料不完整',
      en: 'Beneficial Owner information incomplete',
    },
    summary: {
      zh: '公司有多位受益人,但沒把所有 BO 的身分與地址證明都提供完整。',
      en: 'The company has multiple beneficial owners but not all of their ID and proof-of-address have been submitted.',
    },
    patterns: [
      { regex: /beneficial\s+owner/i, weight: 10 },
      { regex: /additional\s+(?:beneficial\s+)?owner/i, weight: 9 },
      { regex: /all\s+owner[s]?\s+must/i, weight: 8 },
      { regex: /(?:25|twenty[-\s]?five)\s*%/i, weight: 6 },
    ],
    causes: [
      {
        zh: '漏掉一位 25% 以上股份的股東。',
        en: 'Missed one shareholder holding 25% or more.',
      },
      {
        zh: 'Seller Central 上「我已新增所有 BO」沒勾 Yes。',
        en: 'The "I have added all beneficial owners: Yes" confirmation was not clicked in Seller Central.',
      },
      {
        zh: '只交了 BO 的身分證、沒交 POA(反之亦然)。',
        en: 'Only submitted ID for a BO without POA (or vice versa).',
      },
    ],
    nextSteps: [
      {
        zh: '對照公司登記文件上列出的每一位 BO,逐一提供:身分證正反面 + 90 天內地址證明。',
        en: 'For every BO listed on the company registration, submit: ID (both sides) + proof of address dated within 90 days.',
      },
      {
        zh: '確保每位 BO 姓名拼音在所有文件之間 100% 一致。',
        en: 'Ensure each BO name romanization is 100% consistent across all documents.',
      },
      {
        zh: '回到 Seller Central → 受益人頁面,確認「我已新增所有 BO」勾 Yes。',
        en: 'Go back to Seller Central → Beneficial Owners page and confirm "I have added all beneficial owners: Yes".',
      },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'address_inconsistency',
    title: {
      zh: '地址不一致',
      en: 'Address inconsistency',
    },
    summary: {
      zh: '後台填的地址、銀行對帳單、POA、公司登記上的地址對不上。',
      en: "Addresses don't match across Seller Central, bank statement, POA, and company registration.",
    },
    patterns: [
      { regex: /address\s+(?:does\s+not|doesn['’]t)\s+match/i, weight: 10 },
      { regex: /inconsistent\s+address/i, weight: 9 },
      { regex: /address\s+discrepanc(?:y|ies)/i, weight: 9 },
      { regex: /registered\s+address\s+differs/i, weight: 8 },
    ],
    causes: [
      {
        zh: '中英文地址互譯時巷弄樓層標記方式不統一。',
        en: 'Inconsistent translation of lanes / alleys / floors between Chinese and English.',
      },
      {
        zh: '部分文件用舊地址、部分用新地址(搬家後更新不完全)。',
        en: 'Some documents show the old address, others show the new one (incomplete post-move update).',
      },
      {
        zh: '標準格式沒用:缺 Room / Building / # 這類關鍵字。',
        en: 'Standard format not followed — missing Room / Building / # markers.',
      },
    ],
    nextSteps: [
      {
        zh: '選一個「主版」英文地址(建議:Room XX, Building YY, #123 ABC Road, District, City),把所有文件與後台都統一為這一版。',
        en: 'Pick one canonical English address (suggested format: Room XX, Building YY, #123 ABC Road, District, City) and align every document and Seller Central to this version.',
      },
      {
        zh: '後台與文件上的地址要逐字一致(空格、逗號、大小寫都要對)。',
        en: "Seller Central and documents must match character-for-character (spaces, commas, capitalization all included).",
      },
      {
        zh: '若搬家後還有舊地址文件,要求重新開立新地址版本,不要硬用舊的。',
        en: "After a move, request fresh documents reflecting the new address — don't reuse the old ones.",
      },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
];

// -------------------- Classifier --------------------

export interface ClassifyResult {
  category: RejectionCategory;
  def: CategoryDef;
  score: number;
  /** Raw matches for transparency */
  matchedSignals: string[];
  /** Alternative categories that also had a non-zero score */
  alternatives: Array<{ category: RejectionCategory; def: CategoryDef; score: number }>;
}

const UNKNOWN_DEF: CategoryDef = {
  id: 'unknown',
  title: {
    zh: '無法自動分類',
    en: 'Could not auto-classify',
  },
  summary: {
    zh: '這段文字沒有匹配到任何常見退件模式。請對照下方通用建議,或提供更完整的 Amazon 回覆。',
    en: "This message didn't match any known rejection pattern. See the general guidance below or paste a more complete Amazon response.",
  },
  patterns: [],
  causes: [
    {
      zh: '可能是你貼的訊息太短(請包含 Amazon 完整回覆)。',
      en: 'The pasted message may be too short — include the full Amazon response.',
    },
    {
      zh: '也可能是新型退件原因,我們的規則庫還沒涵蓋。',
      en: 'It may be a newer rejection pattern our rules have yet to capture.',
    },
  ],
  nextSteps: [
    {
      zh: '再讀一次 Amazon 的回覆,找出最關鍵的一句(他們要求什麼、說缺什麼)。',
      en: "Re-read the Amazon message and isolate the key sentence (what they ask for, what they say is missing).",
    },
    {
      zh: '回到「提交前預檢」頁面,對照你的主體類型,檢查有沒有遺漏文件。',
      en: 'Return to the Pre-Check tab and cross-check your entity type against the full document list.',
    },
    {
      zh: '若仍無頭緒,去 Seller Central 開 case,直接問 Seller Support「請明確告知我缺少什麼文件或欄位」。',
      en: 'If still unclear, open a Seller Central case and directly ask Seller Support: "please specify exactly which document or field is missing".',
    },
  ],
  sources: [
    {
      type: 'experience',
      label: {
        zh: '通用退件處理建議',
        en: 'General fallback guidance',
      },
      note: {
        zh: '當訊息無法分類時的保守建議,供賣家在無更多上下文時參考。',
        en: 'Conservative guidance for sellers when the message cannot be classified.',
      },
    },
  ],
};

export function classifyRejection(text: string): ClassifyResult {
  if (!text || text.trim().length < 20) {
    return {
      category: 'unknown',
      def: applyOverride(UNKNOWN_DEF),
      score: 0,
      matchedSignals: [],
      alternatives: [],
    };
  }

  const overrides = loadOverrides();
  const scores = new Map<RejectionCategory, number>();
  const matches = new Map<RejectionCategory, string[]>();

  for (const cat of categories) {
    let score = 0;
    const hits: string[] = [];
    for (const p of cat.patterns) {
      const m = text.match(p.regex);
      if (m) {
        score += p.weight;
        hits.push(m[0]);
      }
    }
    // User-contributed keywords (from Module ③ editor)
    const extras = overrides[cat.id]?.extraKeywords ?? [];
    for (const kw of extras) {
      if (!kw.trim()) continue;
      try {
        const re = new RegExp(escapeRegExp(kw), 'i');
        const m = text.match(re);
        if (m) {
          score += 8; // user-defined keywords carry solid weight
          hits.push(m[0]);
        }
      } catch {
        /* ignore invalid pattern */
      }
    }
    if (score > 0) {
      scores.set(cat.id, score);
      matches.set(cat.id, hits);
    }
  }

  if (scores.size === 0) {
    return {
      category: 'unknown',
      def: applyOverride(UNKNOWN_DEF),
      score: 0,
      matchedSignals: [],
      alternatives: [],
    };
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topId, topScore] = ranked[0];
  const topDef = applyOverride(categories.find((c) => c.id === topId)!);
  const alternatives = ranked.slice(1, 3).map(([id, score]) => ({
    category: id,
    def: applyOverride(categories.find((c) => c.id === id)!),
    score,
  }));

  return {
    category: topId,
    def: topDef,
    score: topScore,
    matchedSignals: matches.get(topId) ?? [],
    alternatives,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Merge a user's saved override on top of a built-in CategoryDef. */
export function applyOverride(def: CategoryDef): CategoryDef {
  const override = loadOverrides()[def.id];
  return mergeCategoryOverride(def, override);
}

export function mergeCategoryOverride(
  def: CategoryDef,
  override: CustomOverride | undefined,
): CategoryDef {
  if (!override) return def;
  return {
    ...def,
    title: override.title ?? def.title,
    summary: override.summary ?? def.summary,
    causes: override.causes ?? def.causes,
    nextSteps: override.nextSteps ?? def.nextSteps,
  };
}

/** All categories including the fallback UNKNOWN entry — used by the editor UI. */
export function getAllCategoryDefs(): CategoryDef[] {
  return [...categories, UNKNOWN_DEF];
}
