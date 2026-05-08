import type { ChecklistItem, Rule, Source, WizardAnswers } from './types';

// ============================================================
// PUBLIC sources (rendered to sellers — 'official' | 'experience' only)
// ============================================================

const PUB_SELLER_CENTRAL_KYC: Source = {
  type: 'official',
  label: {
    zh: 'Amazon Seller Central — 身分驗證 (KYC) 要求',
    en: 'Amazon Seller Central — Identity / KYC Verification requirements',
  },
  url: 'https://sellercentral.amazon.co.uk/help/hub/reference/external/200405020',
  retrievedAt: '2026-05-07',
  note: {
    zh: 'Amazon EU 官方 Help page，列出 KYC 要求的文件類型。實際欄位會隨帳號狀況變動。',
    en: 'Official Amazon EU Help page listing the document types required for KYC. Actual fields may vary by account status.',
  },
};

const PUB_EXPERIENCE_RECENT_CASES: Source = {
  type: 'experience',
  label: {
    zh: '近期 EU KYC 退件案例整理',
    en: 'Recent EU KYC rejection pattern summary',
  },
  note: {
    zh: '匿名化整理多起 2024–2026 年歐洲站退件案件的共通點，未包含任何賣家或案件識別資訊。',
    en: 'Anonymized summary of common patterns across multiple 2024–2026 EU rejection cases. Contains no seller or case identifiers.',
  },
};

const PUB_EXPERIENCE_90_DAYS: Source = {
  type: 'experience',
  label: {
    zh: '文件時效觀察（約 90 天門檻）',
    en: 'Document freshness observation (~90-day threshold)',
  },
  note: {
    zh: '未見 Amazon 明文公告統一的「90 天」門檻，但多起案例顯示超過約 90 天的文件常被要求重新提交。',
    en: 'Amazon has not publicly documented a uniform "90-day" threshold, but multiple cases indicate documents older than ~90 days are commonly re-requested.',
  },
};

const PUB_EXPERIENCE_NAME_CONSISTENCY: Source = {
  type: 'experience',
  label: {
    zh: '拼音一致性退件觀察',
    en: 'Name-romanization-consistency rejection pattern',
  },
  note: {
    zh: '對拼音嚴格度沒有官方公開規範，依多起退件案例歸納。',
    en: 'No public Amazon documentation specifies the strictness; summarized from rejection cases.',
  },
};

const PUB_EXPERIENCE_INFO_CHANGE: Source = {
  type: 'experience',
  label: {
    zh: '資訊變更後重審觀察',
    en: 'Re-verification after info change (observed)',
  },
  note: {
    zh: '地址 / Email / 電話變更會重新觸發 KYC，來自實際案例共通模式，非官方公告字面規定。',
    en: 'Address / email / phone changes re-trigger KYC — observed across cases, not a verbatim public policy.',
  },
};

// ============================================================
// INTERNAL references (NEVER rendered — traceability only)
// Keep entries short and scrubbed of PII, URLs, or case IDs.
// ============================================================

const INT_KYC_ESC_WIKI: Source = {
  type: 'internal_wiki',
  label: {
    zh: 'KYC EU 內部升級處理 wiki',
    en: 'KYC EU internal escalations wiki',
  },
  retrievedAt: '2026-05-07',
};

const INT_ONGOING_KYC_WIKI: Source = {
  type: 'internal_wiki',
  label: {
    zh: 'Ongoing KYC 內部處理 wiki',
    en: 'Ongoing KYC internal wiki',
  },
  retrievedAt: '2026-05-07',
};

const INT_KYC_COMPLIANCE_GUIDE: Source = {
  type: 'internal_wiki',
  label: {
    zh: '內部 KYC 合規整理文件',
    en: 'Internal KYC compliance summary document',
  },
  retrievedAt: '2026-05-07',
};

const INT_BAV_ESCALATION_2026Q2: Source = {
  type: 'case_evidence',
  label: {
    zh: '2026 Q2 BAV 升級案（多次退件 / 資訊變更觸發重審）',
    en: '2026 Q2 BAV escalation case (repeated rejections, re-verification after info change)',
  },
  retrievedAt: '2026-04-02',
};

// ============================================================
// Items
// ============================================================

const COMPANY_REGISTRATION: ChecklistItem = {
  id: 'company_registration',
  title: {
    zh: '公司設立登記表（彩色掃描）',
    en: 'Company Registration Document (color scan)',
  },
  why: {
    zh: '證明公司合法存在，亞馬遜會比對英文名稱、統一編號、登記地址、受益人。',
    en: 'Proves the legal entity exists. Amazon cross-checks the English name, registration number, registered address, and beneficial owners.',
  },
  prepTips: [
    {
      zh: '公司英文名稱須與國貿局登記完全一致（大小寫、空格、標點符號都要對）。',
      en: 'English name must match the national registration EXACTLY (case, spaces, punctuation included).',
    },
    {
      zh: '使用政府官方出具的彩色掃描件，不要手機翻拍。',
      en: 'Use an official color scan from the government portal. Avoid phone photos.',
    },
    {
      zh: '確認文件上的所有受益人姓名拼音與你後台填的完全相同。',
      en: 'Make sure every beneficial owner name (romanization) matches what you entered in Seller Central.',
    },
  ],
  commonRejection: [
    {
      zh: '公司英文名稱後台少一個空格或多一個字母 → 退件。',
      en: 'English name in Seller Central missing a space or has a typo vs. the registration → rejected.',
    },
    {
      zh: '受益人姓名拼音版本不一致（如 CHIU vs. QIU）→ 要求重新提交。',
      en: 'Inconsistent romanization of owner name (e.g. CHIU vs. QIU) → resubmission requested.',
    },
  ],
  priority: 'required',
  category: 'entity',
  sources: [PUB_SELLER_CENTRAL_KYC, PUB_EXPERIENCE_NAME_CONSISTENCY],
  internalRefs: [INT_KYC_COMPLIANCE_GUIDE, INT_KYC_ESC_WIKI],
};

const BUSINESS_LICENSE: ChecklistItem = {
  id: 'business_license',
  title: {
    zh: '商業登記核准函 + 商業登記抄本',
    en: 'Business License + Business Registration Extract',
  },
  why: {
    zh: '行號（非公司）主體必備。亞馬遜要兩份一起看：核准函證明合法註冊、抄本證明目前仍有效。',
    en: 'Required for sole proprietorships. Amazon asks for BOTH: the approval letter (proof of legal registration) and the extract (proof of current validity).',
  },
  prepTips: [
    {
      zh: '只提交其中一份常被退件，請兩份一起上傳。',
      en: 'Submitting only one is a common rejection. Upload both together.',
    },
    {
      zh: '確認抄本日期是最新的(180 天內;90 天內最穩)。',
      en: 'Make sure the extract is recent (within 180 days; ≤90 days is safest).',
    },
  ],
  commonRejection: [
    {
      zh: '只上傳核准函、沒附抄本 → 要求補件。',
      en: 'Missing extract → resubmission requested.',
    },
  ],
  priority: 'required',
  category: 'entity',
  sources: [PUB_EXPERIENCE_RECENT_CASES, PUB_EXPERIENCE_90_DAYS],
  internalRefs: [INT_KYC_COMPLIANCE_GUIDE],
};

const BO_ID: ChecklistItem = {
  id: 'bo_identity',
  title: {
    zh: '受益人身分證 / 護照（正反面彩色掃描）',
    en: 'Beneficial Owner ID / Passport (color scan, both sides)',
  },
  why: {
    zh: '每一位持股 25% 以上或具管理權的自然人都要附。KYC 特別重視姓名拼音一致性。',
    en: 'Required for each natural person holding 25%+ shares or management control. KYC is especially strict about name spelling consistency.',
  },
  prepTips: [
    {
      zh: '身分證拼音必須與公司登記、後台資料、銀行對帳單上的姓名「字符級」一致。',
      en: 'The romanized name on the ID must match the name on the company registration, Seller Central, and bank statement character-for-character.',
    },
    {
      zh: '證件須在有效期內，過期前 3 個月最好先換發再提交。',
      en: 'ID must be valid. If it expires within 3 months, renew it before submitting.',
    },
    {
      zh: '正反兩面都要，拍糊、遮字、反光都會被退件。',
      en: 'Both sides required. Blurry, obstructed, or glare-heavy scans will be rejected.',
    },
  ],
  commonRejection: [
    {
      zh: '台灣身分證常見問題：反面地址被拍糊或被手指遮住。',
      en: 'Taiwan ID: back side address is often blurry or obstructed by fingers.',
    },
    {
      zh: '姓名拼音在不同文件中大小寫或順序不一致。',
      en: 'Inconsistent capitalization or order of romanized name across documents.',
    },
  ],
  priority: 'required',
  category: 'identity',
  sources: [PUB_SELLER_CENTRAL_KYC, PUB_EXPERIENCE_NAME_CONSISTENCY],
  internalRefs: [INT_KYC_ESC_WIKI],
};

const PROOF_OF_ADDRESS: ChecklistItem = {
  id: 'proof_of_address',
  title: {
    zh: '地址證明 (POA)：水電 / 電信 / 銀行對帳單',
    en: 'Proof of Address: utility / telecom / bank statement',
  },
  why: {
    zh: '亞馬遜要驗證法人或個人實際居住地址。必須是 90 天內開立、姓名與地址都看得見的正式帳單。',
    en: 'Verifies the real residential address of the legal representative / individual. Must be issued within the last 90 days, showing both name and address.',
  },
  prepTips: [
    {
      zh: '帳單上的地址必須與後台填寫的地址完全一致（門牌、樓層、室號都要對）。',
      en: 'Address on the bill must match Seller Central exactly (street #, floor, unit all included).',
    },
    {
      zh: '英文地址格式請用：Room XX, Building YY, #123 ABC Road, District, City.',
      en: 'English address format: Room XX, Building YY, #123 ABC Road, District, City.',
    },
    {
      zh: '手機帳單有時會被退，水電或市話通常最保險。',
      en: 'Mobile bills are sometimes rejected. Utility or landline bills are usually safest.',
    },
  ],
  commonRejection: [
    {
      zh: '帳單日期超過 90 天 → 退件。',
      en: 'Bill older than 90 days → rejected.',
    },
    {
      zh: '中英地址譯法不一致（巷弄樓層拼法不統一）。',
      en: 'Inconsistent translation of lanes / alleys / floors between Chinese and English.',
    },
    {
      zh: '帳單上的名字是配偶或家人、非法人本人。',
      en: "Bill is in a spouse or family member's name, not the legal representative.",
    },
  ],
  priority: 'required',
  category: 'address',
  sources: [PUB_SELLER_CENTRAL_KYC, PUB_EXPERIENCE_90_DAYS],
  internalRefs: [INT_KYC_COMPLIANCE_GUIDE],
};

const BANK_STATEMENT: ChecklistItem = {
  id: 'bank_statement',
  title: {
    zh: '銀行對帳單 / 證明信(180 天內)',
    en: 'Bank Statement / Certified Letter (within 180 days)',
  },
  why: {
    zh: '對帳單要對上亞馬遜收款帳戶的持有人與銀行代碼。第三方收款（Payoneer 等）要另一套驗證。',
    en: 'The statement must match the disbursement account holder and bank code. Third-party accounts (Payoneer etc.) require a different verification flow.',
  },
  prepTips: [
    {
      zh: '帳戶持有人姓名要與身分證拼音、公司登記 100% 一致。',
      en: 'Account holder name must be 100% consistent with ID romanization and company registration.',
    },
    {
      zh: '對帳單須是銀行正式開立版本，有銀行抬頭、印戳或官方浮水印。',
      en: 'Must be an official bank-issued statement with bank letterhead, stamp, or watermark.',
    },
    {
      zh: '確認 IBAN / SWIFT / BIC 與你在後台填的完全相同。',
      en: 'Double-check IBAN / SWIFT / BIC against Seller Central — must be identical.',
    },
    {
      zh: '官方 BAV 要求「180 天內」，雖然 90 天內最穩；超過 180 天一定退件。',
      en: 'Official BAV window is 180 days (≤90 days is safest); anything older than 180 days will be rejected.',
    },
  ],
  commonRejection: [
    {
      zh: '網銀截圖不是正式對帳單 → 退件。',
      en: 'Online banking screenshots are not official statements → rejected.',
    },
    {
      zh: '公司帳戶名字與公司英文名略有差異。',
      en: "Account name slightly differs from the company's English name.",
    },
    {
      zh: '文件超過 180 天(Amazon 公版退件原因之一)。',
      en: 'Document older than 180 days (one of Amazon\'s standard rejection reasons).',
    },
  ],
  priority: 'required',
  category: 'bank',
  sources: [PUB_SELLER_CENTRAL_KYC, PUB_EXPERIENCE_RECENT_CASES, PUB_EXPERIENCE_90_DAYS],
  internalRefs: [INT_BAV_ESCALATION_2026Q2],
};

const THIRD_PARTY_BANK: ChecklistItem = {
  id: 'third_party_bank',
  title: {
    zh: '第三方收款帳戶驗證文件（Payoneer / WF / PingPong）',
    en: 'Third-Party Payment Account Verification (Payoneer / WorldFirst / PingPong)',
  },
  why: {
    zh: '第三方收款本身另外要做 Bank Account Verification (BAV)，跟 KYC 是兩條線。',
    en: 'Third-party payment providers require a separate Bank Account Verification (BAV) flow, independent from KYC.',
  },
  prepTips: [
    {
      zh: '下載第三方平台給的 "Account Confirmation Letter" (ACL) 或對帳單。',
      en: 'Download the Account Confirmation Letter (ACL) or statement from your provider.',
    },
    {
      zh: '確認收款幣別與亞馬遜付款的幣別匹配。',
      en: 'Make sure the account currency matches what Amazon will disburse.',
    },
    {
      zh: '若 BAV 被退件，第一個動作是去 Payoneer/WF 後台再重下一次 ACL，不要直接申訴。',
      en: 'If BAV fails, first re-download a fresh ACL from your provider before appealing.',
    },
  ],
  commonRejection: [
    {
      zh: 'ACL 超過 90 天 → 重新下載。',
      en: 'ACL older than 90 days → download a fresh one.',
    },
    {
      zh: '後台填的收款帳戶資訊與 ACL 不完全一致。',
      en: 'Seller Central disbursement settings do not match the ACL exactly.',
    },
  ],
  priority: 'required',
  category: 'bank',
  sources: [PUB_EXPERIENCE_RECENT_CASES, PUB_EXPERIENCE_90_DAYS],
  internalRefs: [INT_ONGOING_KYC_WIKI, INT_BAV_ESCALATION_2026Q2],
};

const CREDIT_CARD: ChecklistItem = {
  id: 'credit_card',
  title: {
    zh: '國際信用卡(支援多幣別)',
    en: 'International Credit Card (multi-currency)',
  },
  why: {
    zh: '扣月費、促銷預扣、廣告費。KYC 期間如果卡片過期或額度不足會連動出問題。',
    en: 'Used for monthly fees, promotion holds, and ad spend. Expired cards or low limits cause cascading KYC issues.',
  },
  prepTips: [
    {
      zh: 'VISA、MasterCard 為實務上常見選擇(業界經驗,非官方排序)。JCB 部分支援。',
      en: 'VISA and MasterCard are commonly used (operational experience, not an official ranking). JCB has limited support.',
    },
    {
      zh: '卡片持有人英文姓名應與法人身分一致,非法人卡要特別小心。',
      en: "Cardholder English name should match the legal representative. Be careful when using a card in someone else's name.",
    },
    {
      zh: '額度建議預留 USD $500 以上緩衝,廣告帳戶扣款失敗會觸發審查。',
      en: 'Keep at least USD $500 buffer — failed ad charges can trigger additional review.',
    },
  ],
  commonRejection: [
    {
      zh: '用別人名字的信用卡被亞馬遜標記為關聯風險。',
      en: "Using someone else's card can be flagged as an account linkage risk.",
    },
  ],
  priority: 'required',
  category: 'other',
  sources: [PUB_SELLER_CENTRAL_KYC, PUB_EXPERIENCE_RECENT_CASES],
  internalRefs: [INT_KYC_COMPLIANCE_GUIDE],
};

const MULTI_BO_STATEMENT: ChecklistItem = {
  id: 'multi_bo_statement',
  title: {
    zh: '所有受益人聲明 (Beneficial Owner Declaration)',
    en: 'Declaration for All Beneficial Owners',
  },
  why: {
    zh: '多位受益人時常發生的退件原因是「只上傳部分 BO」。系統會依公司登記上列出的所有 BO 逐一比對。',
    en: 'With multiple owners, the most common rejection is "uploaded only some BOs". The system checks every beneficial owner listed on the registration.',
  },
  prepTips: [
    {
      zh: '為每一位 BO 各準備一份身分證明 + 地址證明。',
      en: 'Prepare one ID + one proof of address per beneficial owner.',
    },
    {
      zh: 'Seller Central 上「我已新增所有 BO」要勾 Yes，否則卡關。',
      en: 'In Seller Central, confirm "I have added all beneficial owners: Yes" — otherwise the review stalls.',
    },
  ],
  commonRejection: [
    {
      zh: '漏掉一位小股東，KYC 停在「待補件」。',
      en: 'Missing one minor shareholder — KYC stuck at "additional info needed".',
    },
  ],
  priority: 'required',
  category: 'identity',
  sources: [PUB_EXPERIENCE_RECENT_CASES],
  internalRefs: [INT_KYC_ESC_WIKI, INT_KYC_COMPLIANCE_GUIDE],
};

const INFO_CHANGE_REVERIFICATION: ChecklistItem = {
  id: 'info_change',
  title: {
    zh: '資訊變更二次驗證準備',
    en: 'Re-verification after Information Change',
  },
  why: {
    zh: '你最近改過地址 / Email / 電話，會觸發重新 KYC。常見的狀況是文件還沒上傳完整帳號就先被限制銷售。',
    en: 'Recent changes to address / email / phone re-trigger KYC. Commonly sellers get selling privileges paused before all documents are uploaded.',
  },
  prepTips: [
    {
      zh: '變更前先把所有新地址的 POA、銀行對帳單備好，收到通知當天就上傳。',
      en: 'Before making the change, have the POA and bank statement for the NEW address ready so you can upload the moment the notice arrives.',
    },
    {
      zh: '如果只是小改（例如同棟樓改室號），上傳變更聲明書比直接改表格更快過。',
      en: 'For minor changes (e.g. unit number within the same building), uploading a "change of address" declaration often clears faster than editing the form directly.',
    },
  ],
  commonRejection: [
    {
      zh: '新地址 POA 還沒拿到就先改後台，變更完連續 14 天被退件。',
      en: 'Updated Seller Central before the new POA was ready — rejected continuously for 14 days.',
    },
  ],
  priority: 'recommended',
  category: 'address',
  sources: [PUB_EXPERIENCE_INFO_CHANGE, PUB_EXPERIENCE_RECENT_CASES],
  internalRefs: [INT_BAV_ESCALATION_2026Q2, INT_KYC_COMPLIANCE_GUIDE],
};

const INDIVIDUAL_PROOF: ChecklistItem = {
  id: 'individual_proof',
  title: {
    zh: '個人資金來源 / 稅籍證明（視情況）',
    en: 'Individual Source-of-Funds / Tax Residency Proof (conditional)',
  },
  why: {
    zh: '個人賣家有時會被要求補稅籍證明（Tax Residency Certificate）或銀行流水，證明資金來源合法。',
    en: 'Individual sellers are sometimes asked for a Tax Residency Certificate or bank history to demonstrate legitimate source of funds.',
  },
  prepTips: [
    {
      zh: '台灣可申請「所得稅居民證明」給海外用。',
      en: 'In Taiwan, apply for the Tax Residency Certificate at the National Taxation Bureau for overseas use.',
    },
  ],
  commonRejection: [],
  priority: 'conditional',
  category: 'identity',
  sources: [PUB_EXPERIENCE_RECENT_CASES],
  internalRefs: [INT_ONGOING_KYC_WIKI, INT_KYC_COMPLIANCE_GUIDE],
};

// ============================================================
// Rules
// ============================================================

export const rules: Rule[] = [
  {
    id: 'limited_company_base',
    when: (a) => a.entity === 'limited',
    items: [COMPANY_REGISTRATION, BO_ID, PROOF_OF_ADDRESS, BANK_STATEMENT, CREDIT_CARD],
  },
  {
    id: 'sole_prop_base',
    when: (a) => a.entity === 'sole_prop',
    items: [BUSINESS_LICENSE, BO_ID, PROOF_OF_ADDRESS, BANK_STATEMENT, CREDIT_CARD],
  },
  {
    id: 'individual_base',
    when: (a) => a.entity === 'individual',
    items: [BO_ID, PROOF_OF_ADDRESS, BANK_STATEMENT, CREDIT_CARD, INDIVIDUAL_PROOF],
  },
  {
    id: 'multi_bo',
    when: (a) => a.entity !== 'individual' && (a.boCount === '2' || a.boCount === '3+'),
    items: [MULTI_BO_STATEMENT],
  },
  {
    id: 'third_party_bank',
    when: (a) => a.bank === 'third_party',
    items: [THIRD_PARTY_BANK],
  },
  {
    id: 'info_changed',
    when: (a) => a.addressChanged === 'yes',
    items: [INFO_CHANGE_REVERIFICATION],
  },
];

// ============================================================
// Engine (only PUBLIC `sources` are ever returned — `internalRefs` is stripped)
// ============================================================

export function generateChecklist(answers: WizardAnswers): ChecklistItem[] {
  const picked = new Map<string, ChecklistItem>();
  for (const rule of rules) {
    if (rule.when(answers)) {
      for (const item of rule.items) {
        if (!picked.has(item.id)) {
          // Strip internalRefs before returning — defense in depth so even if
          // UI forgets, internal data never reaches the render tree.
          const { internalRefs: _ignored, ...publicItem } = item;
          picked.set(item.id, publicItem as ChecklistItem);
        }
      }
    }
  }
  const priorityRank: Record<string, number> = { required: 0, conditional: 1, recommended: 2 };
  return [...picked.values()].sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority],
  );
}

// ============================================================
// Dev-time invariants (throw at module load if rules are malformed)
//   1. every item has at least one public source
//   2. public `sources` only contain 'official' or 'experience'
//   3. `internalRefs` only contain 'internal_wiki' or 'case_evidence'
// ============================================================
{
  const allItems: ChecklistItem[] = rules.flatMap((r) => r.items);
  const errors: string[] = [];

  for (const it of allItems) {
    if (!it.sources || it.sources.length === 0) {
      errors.push(`[${it.id}] missing public \`sources\``);
    }
    for (const s of it.sources ?? []) {
      if (s.type !== 'official' && s.type !== 'experience') {
        errors.push(
          `[${it.id}] public sources may only be 'official' or 'experience'; got '${s.type}'. Move it to \`internalRefs\`.`,
        );
      }
    }
    for (const s of it.internalRefs ?? []) {
      if (s.type !== 'internal_wiki' && s.type !== 'case_evidence') {
        errors.push(
          `[${it.id}] internalRefs may only be 'internal_wiki' or 'case_evidence'; got '${s.type}'.`,
        );
      }
      if (s.url) {
        errors.push(`[${it.id}] internalRefs must not carry urls (source: ${s.type}).`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `[kycRules] Source attribution violations:\n  - ${errors.join('\n  - ')}\nSee .kiro/steering/source-attribution.md`,
    );
  }
}
