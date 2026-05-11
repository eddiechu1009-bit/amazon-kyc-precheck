import type { Bilingual, Source } from './types';
import { loadOverrides, type CustomOverride } from './customRules';

// ============================================================
// Classifies a pasted Amazon rejection / verification failure message
// and produces: category, likely causes, next steps, response draft.
//
// Patterns are derived from the official Amazon Seller Support
// boilerplate language observed in real cases. See
// .kiro/steering/source-attribution.md — this module only emits
// 'official' + 'experience' sources.
// ============================================================

export type RejectionCategory =
  // --- BAV / bank document ---
  | 'bav_document_authenticity'
  | 'bav_document_missing_fields'
  | 'name_mismatch'
  | 'third_party_acl_invalid'
  // --- Document quality ---
  | 'kyc_document_quality'
  | 'document_expired_180'
  | 'document_translation_missing'
  // --- BO / corporate structure ---
  | 'bo_incomplete'
  | 'shareholder_structure_missing'
  | 'loa_invalid'
  | 'company_extract_expired'
  // --- Address / POA ---
  | 'address_inconsistency'
  | 'poa_name_mismatch_holder'
  | 'poa_type_unaccepted'
  // --- Process & status ---
  | 'info_change_reverification'
  | 'sixty_day_deadline_expired'
  | 'pending_threshold_triggered'
  | 'listings_disbursements_blocked'
  // --- Navigation / scope confusion ---
  | 'wrong_marketplace_notification'
  | 'check_performance_notifications'
  | 'vat_not_kyc_scope'
  // --- Fallback ---
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
  /** Public sources backing the advice */
  sources: Source[];
}

// ============================================================
// Public sources (only 'official' + 'experience' allowed)
// ============================================================

const SRC_BAV_HELP: Source = {
  type: 'official',
  label: {
    zh: 'Amazon Seller Central — Bank Account Verification 文件要求',
    en: 'Amazon Seller Central — Bank Account Verification document requirements',
  },
  url: 'https://sellercentral.amazon.co.uk/help/hub/reference/external/G201200780',
  retrievedAt: '2026-05-07',
  note: {
    zh: 'Amazon 官方 Help page,列出 BAV 所需文件與格式要求。',
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
    en: 'Classification keywords derived from Amazon Seller Support rejection boilerplate; no seller-identifying data retained.',
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

const SRC_EXPERIENCE_KYC_PROCESS: Source = {
  type: 'experience',
  label: {
    zh: 'EU KYC 流程與狀態機制觀察',
    en: 'EU KYC process & status-machine observations',
  },
  note: {
    zh: '匿名化整理 KYC 流程、60 天時效、PendingThreshold、重新驗證觸發等系統性規則,非任何單一 case 細節。',
    en: 'Anonymized compilation of KYC process rules (60-day SLA, PendingThreshold, re-verification triggers); not tied to any single case.',
  },
};

const SRC_EXPERIENCE_NAV: Source = {
  type: 'experience',
  label: {
    zh: '賣家後台操作常見誤區',
    en: 'Common seller-central navigation pitfalls',
  },
  note: {
    zh: '匿名化整理多數賣家在後台找不到、看錯 tab、誤解 VAT / KYC 歸屬等常見問題。',
    en: 'Anonymized summary of frequent seller-central navigation mistakes (wrong tab, wrong marketplace, VAT vs KYC scope confusion).',
  },
};

// ============================================================
// Category definitions
// ============================================================

export const categories: CategoryDef[] = [
  // ============================================================
  // Section 1: BAV / Bank document issues
  // ============================================================
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
      { zh: '對帳單上有被手動加上的印章、簽名或文字(例如 Word / PDF 編輯器加的)。', en: 'The statement has a manually added stamp, signature, or text (e.g. inserted via Word / PDF editor).' },
      { zh: '提交的是網銀截圖或匯出 PDF,而不是銀行櫃員正式簽章的證明信。', en: 'Submitted an online banking screenshot or exported PDF instead of a teller-signed certified letter.' },
      { zh: '修圖遮蓋其他欄位時方式不被接受(Amazon 只允許遮餘額,其他資訊都要原樣)。', en: 'The way other fields were redacted is not acceptable (Amazon only allows blocking out the balance; everything else must remain original).' },
    ],
    nextSteps: [
      { zh: '親自到銀行櫃台申請「證明信 / Certified Bank Letter」,要求銀行用正本簽名(非數位簽章)。', en: 'Visit your bank in person and request a Certified Bank Letter with an original (non-digital) wet signature.' },
      { zh: '確認信上有:銀行名稱 + Logo、180 天內日期、帳戶持有人姓名、地址、帳號、銀行原始簽章或印章。', en: 'Confirm the letter shows: bank name + logo, issue date within 180 days, account holder name, address, account number, original bank signature or stamp.' },
      { zh: '絕對不要在文件上做任何編輯或加註記。需要遮的只能是帳戶餘額,其他都保留原樣。', en: 'Do NOT edit or annotate the document. You may only redact the account balance — leave everything else original.' },
      { zh: '回到 Seller Central → Deposit Methods 頁面,按「Retry」按鈕重新上傳。', en: 'Return to Seller Central → Deposit Methods and click "Retry" to re-upload.' },
      { zh: '如果銀行不願開證明信,考慮換一個願意出的銀行(不限 EU,只要收款幣別支援、持有人名符合即可)。', en: 'If your bank refuses, consider switching to another bank. It does not need to be EU-based, as long as it supports the required currency and the holder name matches.' },
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
    ],
    causes: [
      { zh: '文件日期超過 Amazon 要求的有效期(通常 90 天,BAV 可能到 180 天)。', en: 'Document issued outside the required window (typically 90 days, BAV up to 180 days).' },
      { zh: '缺銀行 Logo 或銀行名稱(例如純文字輸出的網銀版本)。', en: 'Missing bank logo or bank name (e.g. plain-text online banking export).' },
      { zh: '缺帳戶持有人的居住地址。', en: 'Missing account holder residential address.' },
      { zh: '缺完整銀行帳號(只有末四碼不夠)。', en: 'Missing full bank account number (last-4 digits alone is not enough).' },
    ],
    nextSteps: [
      { zh: '去銀行要正式開立、含以下全部要素的證明信:銀行名稱+Logo、近 180 天內日期、持有人姓名+居住地址、完整帳號、銀行原始簽章。', en: 'Request an official letter that includes ALL of: bank name + logo, date within the last 180 days, holder name + residential address, full account number, original bank signature.' },
      { zh: '拿回來後逐一對照 Amazon 要求清單,任何一項沒有都再去補,不要先上傳。', en: 'Check every field against the Amazon list before uploading — upload only once all fields are present.' },
      { zh: '上傳前用 A4 紙印出肉眼看一次,確認沒有模糊、切邊、反光的情況。', en: 'Print the document on A4 and eyeball it once before uploading — make sure nothing is blurry, cropped, or glared.' },
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
      { regex: /account\s+holder\s+(?:does\s+not|doesn['’]t)\s+match/i, weight: 10 },
      { regex: /business\s+holder\s+name/i, weight: 8 },
      { regex: /name\s+discrepanc(?:y|ies)/i, weight: 9 },
      { regex: /name\s+(?:does\s+not|doesn['’]t)\s+match/i, weight: 9 },
      { regex: /holder\s+name\s+is\s+missing/i, weight: 9 },
      { regex: /account\s+holder\s+name\s+is\s+missing/i, weight: 10 },
      { regex: /registered\s+with\s+Amazon/i, weight: 4 },
    ],
    causes: [
      { zh: '銀行帳戶是個人名,但 Amazon 後台是公司名(或反過來)。', en: 'Bank account is in a personal name but Amazon is registered as a company (or vice versa).' },
      { zh: '拼音版本不一致(CHIU vs. QIU、有無中間名等)。', en: 'Different romanization of the same name (CHIU vs. QIU, middle name included/excluded, etc).' },
      { zh: '公司名稱中有 "Ltd." / "B.V." / "Inc." 這類後綴在一邊有、另一邊沒有。', en: 'Entity suffixes like "Ltd." / "B.V." / "Inc." are present in one place but not the other.' },
    ],
    nextSteps: [
      { zh: '逐字比對銀行文件上的持有人名 vs Seller Central 後台的註冊名。', en: 'Character-by-character: bank document holder name vs the name registered in Seller Central.' },
      { zh: '若是拼音差異,以官方登記文件上的拼音為準,修改不一致的那一邊。', en: "If it's a romanization difference, align with the official registration and correct the other side." },
      { zh: '若是個人帳戶對應公司登記,最快是換用公司名義開立的銀行帳戶。', en: 'If account is personal but registration is a company, switch to a bank account opened in the company name.' },
      { zh: '換帳戶後,Amazon 允許非 EU 銀行,只要支援收款幣別且持有人名對上即可。', en: 'A non-EU bank is allowed as long as it supports the required currency and the holder name matches.' },
    ],
    sources: [SRC_BAV_HELP, SRC_EXPERIENCE_BAV_BOILERPLATE],
  },
  {
    id: 'third_party_acl_invalid',
    title: {
      zh: '第三方收款 (Payoneer / WF / PingPong) ACL 不符',
      en: 'Third-party payment account (Payoneer / WF / PingPong) verification letter invalid',
    },
    summary: {
      zh: '你用 Payoneer、WorldFirst、PingPong 等第三方收款,但他們發的 ACL(Account Confirmation Letter)不符 Amazon 要求。',
      en: 'You use Payoneer / WorldFirst / PingPong etc., but the Account Confirmation Letter (ACL) they issued does not meet Amazon requirements.',
    },
    patterns: [
      { regex: /account\s+confirmation\s+letter/i, weight: 10 },
      { regex: /\bACL\b/i, weight: 5 },
      { regex: /payoneer|worldfirst|world\s+first|pingpong|ping\s+pong/i, weight: 8 },
      { regex: /third[-\s]?party\s+(?:payment|account)/i, weight: 7 },
      { regex: /payment\s+service\s+provider/i, weight: 6 },
      { regex: /(?:deposit|disbursement)\s+method\s+(?:was\s+)?rejected/i, weight: 5 },
    ],
    causes: [
      { zh: 'ACL 日期已超過 Amazon 接受的時效(通常 90 天內,部分情境 180 天)。', en: 'ACL is older than the accepted window (typically 90 days, up to 180 in some cases).' },
      { zh: 'Amazon 後台填的收款資訊(帳號 / 銀行代碼 / 幣別)與 ACL 上的不一致。', en: 'Seller Central disbursement info does not match the ACL exactly.' },
      { zh: 'ACL 上的「持有人」名稱是個人、後台是公司(或反之)。', en: 'ACL holder name is a person but Seller Central is a company (or vice versa).' },
      { zh: '收款幣別不支援(例如指定 GBP 但 ACL 只支援 USD)。', en: 'Currency mismatch (e.g. required GBP but the ACL only supports USD).' },
    ],
    nextSteps: [
      { zh: '去 Payoneer / WorldFirst / PingPong 後台下載最新版本的 ACL(不要用舊的)。', en: 'Go to your provider portal and download a FRESH ACL (do not reuse old ones).' },
      { zh: '檢查 ACL 上的:收款人名、幣別、帳號、銀行名稱,是否與 Seller Central 設定 100% 一致。', en: 'Verify holder name, currency, account number, bank name on the ACL match Seller Central 100%.' },
      { zh: '若資訊對不上,先在第三方後台改,再回來 Seller Central 重新填寫,最後按 Retry 上傳新 ACL。', en: 'If there is a mismatch, correct it in the provider portal first, re-enter in Seller Central, then click Retry.' },
      { zh: 'BAV 退件通常是「文件問題」不是「帳號問題」,不要急著換銀行,先確認 ACL 本身符合要求。', en: 'BAV rejections are usually document problems, not account problems — fix the ACL before switching banks.' },
    ],
    sources: [SRC_BAV_HELP, SRC_EXPERIENCE_BAV_BOILERPLATE],
  },

  // ============================================================
  // Section 2: Document quality / validity
  // ============================================================
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
      { regex: /re[-\s]?submit/i, weight: 3 },
      { regex: /not\s+valid\s+(?:proof|document)/i, weight: 6 },
      { regex: /(?:photograph|scan)\s+(?:of\s+the\s+)?(?:entire|full|complete)/i, weight: 6 },
      { regex: /(?:document|image)\s+is\s+(?:unclear|blurred|blurry)/i, weight: 9 },
    ],
    causes: [
      { zh: '拍照反光、陰影、手指遮擋關鍵欄位。', en: 'Glare, shadows, or fingers covering key fields.' },
      { zh: '掃描解析度過低(<200 DPI 常被退)。', en: 'Scan resolution too low (<200 DPI is often rejected).' },
      { zh: '文件沒拍完整,邊角被切掉。', en: 'Document edges cropped off.' },
    ],
    nextSteps: [
      { zh: '改用掃描器(或手機掃描 app 如 Adobe Scan / Microsoft Lens),不要直接拍照。', en: 'Use a scanner or a mobile scan app (Adobe Scan / Microsoft Lens) rather than a regular phone photo.' },
      { zh: '掃描設定至少 300 DPI,輸出彩色 PDF 或 PNG。', en: 'Scan at 300 DPI or higher, output as color PDF or PNG.' },
      { zh: '重新提交前自己用 100% 大小檢視,每個欄位都要清楚可讀。', en: 'Before re-submitting, view at 100% zoom — every field must be clearly readable.' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'document_expired_180',
    title: {
      zh: '文件超過 180 天時效',
      en: 'Document older than 180 days',
    },
    summary: {
      zh: 'Amazon 標準規則:多數文件要求「180 天內開立」。超過的幾乎一定會被退。',
      en: "Amazon standard rule: most documents must be issued within the last 180 days. Older ones will almost always be rejected.",
    },
    patterns: [
      { regex: /older\s+than\s+(?:the\s+)?(?:last\s+)?180\s+days/i, weight: 10 },
      { regex: /older\s+than\s+(?:the\s+)?(?:last\s+)?90\s+days/i, weight: 9 },
      { regex: /document\s+is\s+older/i, weight: 7 },
      { regex: /expired\s+document/i, weight: 6 },
      { regex: /(?:issue|issuance)\s+date\s+(?:is\s+)?too\s+old/i, weight: 8 },
    ],
    causes: [
      { zh: '直接用之前申請留下來的舊文件,沒重新申請。', en: 'Reused an old document from a prior application instead of getting a fresh one.' },
      { zh: '銀行 / 政府機構出文件需要等,結果延誤後再提交就超過 180 天。', en: 'Delay in getting a new document (bank / government) pushed it past the 180-day window.' },
    ],
    nextSteps: [
      { zh: '重新申請最新的文件(銀行證明信 / 公司登記抄本 / 水電帳單都一樣)。', en: 'Request a fresh document (bank letter / company extract / utility bill — all have this rule).' },
      { zh: '拿到當天就上傳,不要等累積一批再一次傳(有的文件 30 天就開始不安全)。', en: 'Upload the same day you receive it. Do not batch-wait — some documents start getting risky at 30 days.' },
      { zh: '常態化管理:在行事曆設 150 天提醒,定期檢查帳上所有文件日期。', en: 'Set a 150-day calendar reminder to rotate documents before they age out.' },
    ],
    sources: [SRC_BAV_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'document_translation_missing',
    title: {
      zh: '非英文文件沒附認證翻譯',
      en: 'Non-English document without certified translation',
    },
    summary: {
      zh: '你的文件不是英文的(例如德文、法文、中文),但沒附上認證翻譯,Amazon 看不懂。',
      en: 'Your document is in a non-English language (German, French, Chinese etc.) and was submitted without a certified translation.',
    },
    patterns: [
      { regex: /certified\s+translation/i, weight: 10 },
      { regex: /(?:English|translation)\s+(?:version|copy)/i, weight: 6 },
      { regex: /not\s+(?:in\s+)?English/i, weight: 7 },
      { regex: /translate[d]?\s+(?:by|into|to)\s+English/i, weight: 6 },
    ],
    causes: [
      { zh: '直接上傳母語文件(例如中文公司登記表)沒做翻譯。', en: 'Uploaded the native-language document (e.g. Chinese registration) without any translation.' },
      { zh: '用 Google Translate 翻完直接貼,不是「認證翻譯」(需公證或翻譯社出具)。', en: 'Used Google Translate output instead of a certified translation (needs notary / translation agency).' },
    ],
    nextSteps: [
      { zh: '找當地公證翻譯社做「認證翻譯」(英文稱 Certified Translation),會附翻譯社聲明與簽章。', en: 'Use a certified translation service — they provide a sworn statement and official stamp.' },
      { zh: '同時上傳**原文 + 認證翻譯**兩份檔案,讓 Amazon 可以對照。', en: 'Upload BOTH the original AND the certified translation so Amazon can cross-reference.' },
      { zh: '部分情境(例如台灣公司登記)可以直接向機關申請英文版本,省掉翻譯成本。', en: 'In some jurisdictions (e.g. Taiwan company registration) you can request an official English version directly from the authority.' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },

  // ============================================================
  // Section 3: BO / Corporate structure
  // ============================================================
  {
    id: 'bo_incomplete',
    title: {
      zh: '受益人 (BO) 資料不完整',
      en: 'Beneficial Owner information incomplete',
    },
    summary: {
      zh: '公司有多位受益人,但沒把所有 BO 的身分與地址證明都提供完整,或「我已新增所有 BO」沒勾 Yes。',
      en: 'Multiple beneficial owners exist, but not all of their IDs / proof-of-address were submitted, or the "I have added all BOs" confirmation was not set to Yes.',
    },
    patterns: [
      { regex: /beneficial\s+owner/i, weight: 10 },
      { regex: /additional\s+(?:beneficial\s+)?owner/i, weight: 9 },
      { regex: /all\s+owner[s]?\s+must/i, weight: 8 },
      { regex: /(?:25|twenty[-\s]?five)\s*%/i, weight: 6 },
      { regex: /ultimate\s+beneficial\s+owner/i, weight: 9 },
      { regex: /\bUBO\b/i, weight: 7 },
    ],
    causes: [
      { zh: '漏掉一位 25% 以上股份的股東。', en: 'Missed one shareholder holding 25% or more.' },
      { zh: 'Seller Central 上「我已新增所有 BO」沒勾 Yes。', en: 'The "I have added all beneficial owners: Yes" confirmation was not clicked in Seller Central.' },
      { zh: '只交了 BO 的身分證、沒交 POA(反之亦然)。', en: 'Only submitted ID for a BO without POA (or vice versa).' },
    ],
    nextSteps: [
      { zh: '對照公司登記文件上列出的每一位 BO,逐一提供:身分證正反面 + 90 天內地址證明。', en: 'For every BO listed on the registration, submit: ID (both sides) + proof of address within 90 days.' },
      { zh: '確保每位 BO 姓名拼音在所有文件之間 100% 一致。', en: 'Ensure each BO name romanization is 100% consistent across all documents.' },
      { zh: '回到 Seller Central → 受益人頁面,確認「我已新增所有 BO」勾 Yes。', en: 'Seller Central → Beneficial Owners page → confirm "I have added all beneficial owners: Yes".' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'shareholder_structure_missing',
    title: {
      zh: '股東結構 / 公司架構文件不足',
      en: 'Shareholder structure / corporate hierarchy documents missing',
    },
    summary: {
      zh: '公司有多層控股結構(母公司、子公司、信託),Amazon 要求更完整的股東結構文件。',
      en: 'Your company has multi-layer ownership (parent / holding / trust). Amazon requires complete shareholder structure documentation.',
    },
    patterns: [
      { regex: /(?:ownership|shareholder|corporate)\s+structure/i, weight: 9 },
      { regex: /organizational\s+chart/i, weight: 8 },
      { regex: /share\s+(?:register|allotment|certificate)/i, weight: 9 },
      { regex: /articles\s+of\s+association/i, weight: 8 },
      { regex: /statement\s+of\s+capital/i, weight: 8 },
      { regex: /annual\s+return/i, weight: 6 },
      { regex: /holding\s+company/i, weight: 5 },
      { regex: /parent\s+company/i, weight: 5 },
    ],
    causes: [
      { zh: '只交了本公司登記,沒交母公司 / 控股公司的文件。', en: 'Submitted only your own company registration without parent / holding company documents.' },
      { zh: '「Submitted Statutes」缺 Articles of Association 或股權分配文件。', en: 'Submitted statutes missing Articles of Association or share allotment document.' },
      { zh: '中間有信託(Trust)沒揭露,Amazon 看不到實際受益人。', en: 'A trust layer exists in the ownership chain and was not disclosed.' },
    ],
    nextSteps: [
      { zh: '畫一張「組織架構圖」(Organizational Chart),從最終受益人到本公司每一層都標出股權比例。', en: 'Draw an Organizational Chart from the ultimate beneficial owner down to your entity, showing ownership % at each layer.' },
      { zh: '提交:Articles of Association + Share Register + Statement of Capital(或 Annual Return)三合一。', en: 'Submit: Articles of Association + Share Register + Statement of Capital (or Annual Return) as a package.' },
      { zh: '如有信託,需加交信託契約或受託人聲明,揭露最終受益人。', en: 'If a trust exists, include the trust deed or trustee declaration identifying the ultimate beneficial owner.' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'loa_invalid',
    title: {
      zh: '授權書 (Letter of Authorization) 不符',
      en: 'Letter of Authorization invalid',
    },
    summary: {
      zh: '你提交的授權書沒有授予主要聯絡人「開立、管理、啟動交易」的權限,Amazon 不認可。',
      en: 'The Letter of Authorization you submitted does not authorize the primary contact person to open, manage, and initiate transactions. Amazon will not accept it.',
    },
    patterns: [
      { regex: /letter\s+of\s+authori[sz]ation/i, weight: 10 },
      { regex: /\bLOA\b/, weight: 7 },
      { regex: /authori[sz]e(?:d)?\s+(?:the\s+)?primary\s+contact/i, weight: 9 },
      { regex: /open,?\s+manage,?\s+and\s+initiate\s+transactions/i, weight: 10 },
      { regex: /valid\s+letter\s+of\s+authori[sz]ation/i, weight: 9 },
    ],
    causes: [
      { zh: '授權書只寫「授權簽收文件」,沒寫「開立、管理、啟動交易」三大權限。', en: 'LoA only authorizes "receiving documents" but not "open, manage, initiate transactions".' },
      { zh: '授權書簽名的人不是法人代表(要法人本人 / 董事簽名)。', en: 'LoA is not signed by a legal representative or director.' },
      { zh: '授權書上沒有日期,或日期太舊。', en: 'LoA has no date, or the date is too old.' },
    ],
    nextSteps: [
      { zh: '重新草擬一份 LoA,明確寫出「authorize [name] to open, manage and initiate transactions on the Amazon seller account」。', en: 'Redraft the LoA with explicit wording: "authorize [name] to open, manage and initiate transactions on the Amazon seller account".' },
      { zh: '由法人代表 / 董事親筆簽名(原始簽名,非數位),加公司印章。', en: 'Signed by a legal representative / director with an original (not digital) signature, plus company stamp.' },
      { zh: '註明開立日期,確保在 180 天內。', en: 'Include the issue date and ensure it is within 180 days.' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'company_extract_expired',
    title: {
      zh: '公司登記抄本過期',
      en: 'Company registration extract expired',
    },
    summary: {
      zh: '公司登記「抄本」(extract)有效期通常 180 天,Amazon 會拒絕較舊的版本。',
      en: "The company registration extract is typically required to be issued within 180 days. Amazon will reject older copies.",
    },
    patterns: [
      { regex: /registration\s+extract/i, weight: 10 },
      { regex: /extract\s+is\s+older/i, weight: 9 },
      { regex: /company\s+registration\s+document/i, weight: 5 },
      { regex: /certificate\s+of\s+good\s+standing/i, weight: 8 },
      { regex: /articles\s+of\s+incorporation/i, weight: 6 },
    ],
    causes: [
      { zh: '用了公司最初成立時的登記文件,距今已超過 180 天。', en: 'Submitted the original incorporation document from years ago, now older than 180 days.' },
      { zh: '有的國家會再簽發一張「現時抄本」(current extract),你交了舊的反而被退。', en: "Some jurisdictions issue a 'current extract' — submitting the older original instead will be rejected." },
    ],
    nextSteps: [
      { zh: '向公司登記機關(台灣:經濟部商業司;英國:Companies House)申請最新的「現時抄本」。', en: 'Request a current extract from your company registry (e.g. Taiwan MOEA DoC; UK Companies House).' },
      { zh: '台灣可以用「公司登記查詢」線上申請彩色 PDF,通常 24 小時內拿到。', en: 'In Taiwan you can request a color PDF online via the DoC lookup, usually within 24 hours.' },
      { zh: '拿到後確認:公司英文名、統編、登記地址、董事名單,都跟 Seller Central 後台一致。', en: 'Confirm the extract matches Seller Central: English name, tax ID, registered address, directors list.' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },

  // ============================================================
  // Section 4: Address / POA
  // ============================================================
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
      { zh: '中英文地址互譯時巷弄樓層標記方式不統一。', en: 'Inconsistent translation of lanes / alleys / floors between Chinese and English.' },
      { zh: '部分文件用舊地址、部分用新地址(搬家後更新不完全)。', en: 'Some documents show the old address, others show the new one.' },
      { zh: '標準格式沒用:缺 Room / Building / # 這類關鍵字。', en: 'Standard format not followed — missing Room / Building / # markers.' },
    ],
    nextSteps: [
      { zh: '選一個「主版」英文地址(建議:Room XX, Building YY, #123 ABC Road, District, City),把所有文件與後台都統一為這一版。', en: 'Pick one canonical address (suggested: Room XX, Building YY, #123 ABC Road, District, City) and align every document and Seller Central to it.' },
      { zh: '後台與文件上的地址要逐字一致(空格、逗號、大小寫都要對)。', en: 'Seller Central and documents must match character-for-character.' },
      { zh: '若搬家後還有舊地址文件,要求重新開立新地址版本,不要硬用舊的。', en: "After a move, request fresh documents reflecting the new address — don't reuse the old ones." },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'poa_name_mismatch_holder',
    title: {
      zh: 'POA 帳單上的名字不是法人本人',
      en: 'POA bill not in the legal representative\'s name',
    },
    summary: {
      zh: '你提交的水電 / 電信帳單,持有人是配偶、家人或室友,不是你本人。',
      en: "The utility / telecom bill you submitted is in a spouse's, family member's, or roommate's name — not yours.",
    },
    patterns: [
      { regex: /name\s+on\s+the\s+(?:utility|bill|document)/i, weight: 8 },
      { regex: /bill\s+(?:is\s+)?(?:not\s+)?in\s+(?:your\s+)?name/i, weight: 9 },
      { regex: /proof\s+of\s+(?:residential\s+)?address/i, weight: 6 },
    ],
    causes: [
      { zh: '租屋族常見狀況:水電是房東的名字。', en: 'Common in rentals: utilities are in the landlord\'s name.' },
      { zh: '跟家人同住,帳單是父母 / 配偶的名字。', en: 'Living with family: bills are in a parent\'s or spouse\'s name.' },
    ],
    nextSteps: [
      { zh: '去銀行申請一份**銀行對帳單**,上面是你本人的名字 + 居住地址,這是最快的替代方案。', en: 'Request a bank statement showing your name + residential address — fastest alternative.' },
      { zh: '申辦一張以自己名義開的**電信帳單**(手機 / 市話),下個月就會出帳。', en: 'Open a telecom account (mobile / landline) in your own name — a bill will arrive next month.' },
      { zh: '若只能用家人帳單,附上**戶籍謄本**或**租賃合約**證明居住關係(部分情境可接受,但成功率較低)。', en: "If only a family member's bill is available, attach a household registration or rental contract proving the relationship (lower success rate)." },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },
  {
    id: 'poa_type_unaccepted',
    title: {
      zh: 'POA 文件類型不被接受',
      en: 'POA document type not accepted',
    },
    summary: {
      zh: '你交的 POA 不是 Amazon 接受的類型(例如信用卡帳單不含地址、手機帳單格式不對)。',
      en: 'The POA you submitted is not an accepted type (e.g. credit card bill without address, mobile bill with wrong format).',
    },
    patterns: [
      { regex: /type\s+of\s+(?:bank\s+)?document\s+is\s+not\s+acceptable/i, weight: 10 },
      { regex: /not\s+an?\s+acceptable\s+(?:document|type)/i, weight: 9 },
      { regex: /accepted\s+(?:document|proof)s?/i, weight: 6 },
      { regex: /utility\s+bill|credit\s+card\s+statement/i, weight: 4 },
    ],
    causes: [
      { zh: '提交手機帳單被退 — 部分 KYC 團隊只接受固網(市話)或水電。', en: 'Mobile bill submitted and rejected — some teams only accept landline / utility.' },
      { zh: '提交網銀截圖當 POA,不是正式開立的對帳單。', en: 'Submitted an online-banking screenshot instead of an official bank statement.' },
      { zh: '信用卡帳單沒有居住地址,只有信用卡公司地址。', en: 'Credit card statement only shows the issuer address, not the cardholder residential address.' },
    ],
    nextSteps: [
      { zh: 'Amazon 接受的 POA 類型(90 天內):水電帳單、市話帳單、銀行對帳單、信用卡對帳單(含地址)。', en: "Accepted POA types (within 90 days): utility bill, landline bill, bank statement, credit card statement (with address)." },
      { zh: '最穩的組合:水電帳單或銀行對帳單,這兩個幾乎不會被退。', en: 'Safest picks: utility bill or bank statement — these are rarely rejected.' },
      { zh: '避免:手機帳單、網銀截圖、自製表格。', en: 'Avoid: mobile bills, online-banking screenshots, self-made forms.' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_CASES],
  },

  // ============================================================
  // Section 5: Process & status
  // ============================================================
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
      { zh: '改地址 / Email / 電話後,Amazon 要求用新的資訊重新提供 POA、銀行對帳單等證明。', en: 'After changing address / email / phone, Amazon requires fresh POA and bank statements reflecting the new information.' },
      { zh: '更新後提交的文件仍是舊地址,被判定不一致。', en: 'Documents submitted after the update still show the old address.' },
    ],
    nextSteps: [
      { zh: '先把新地址下的水電 / 電信 / 銀行對帳單(90 天內)準備好再動後台。', en: 'Gather fresh documents (within 90 days) reflecting the new address BEFORE making the change.' },
      { zh: '所有新提交的文件,姓名 / 公司名 / 地址都必須完全反映變更後的最新狀態。', en: 'Every newly submitted document must fully reflect the post-change state.' },
      { zh: '若只是小改(同棟樓改室號),上傳「變更聲明書」加新 POA 通常比改表格更順。', en: 'For minor changes, uploading a change-of-address declaration with a new POA usually clears faster.' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_PROCESS],
  },
  {
    id: 'sixty_day_deadline_expired',
    title: {
      zh: '超過 60 天補件期限',
      en: '60-day submission deadline expired',
    },
    summary: {
      zh: 'Amazon 從 KYC 要求文件那天起給你 60 天,過期系統會自動停止撥款與下架。延期不會核准,只能補齊讓帳號合規。',
      en: "Amazon gives 60 days from the date they first requested the documents. If missed, disbursements and listings are auto-disallowed; extensions are not granted — you must make the account compliant to restore.",
    },
    patterns: [
      { regex: /60\s+days?/i, weight: 9 },
      { regex: /(?:deadline|timeline)\s+(?:has\s+)?(?:passed|expired)/i, weight: 9 },
      { regex: /disallow(?:ed)?\s+(?:by\s+the\s+)?system/i, weight: 7 },
      { regex: /listings\s+(?:and|&)\s+disbursements?/i, weight: 7 },
      { regex: /surpass(?:ed)?\s+60\s+days/i, weight: 10 },
      { regex: /extension[s]?\s+cannot\s+be\s+granted/i, weight: 10 },
      { regex: /request\s+additional\s+details|investigation\s+in\s+progress/i, weight: 6 },
    ],
    causes: [
      { zh: '沒看到 performance notification 通知,錯過 60 天。', en: 'Missed the performance notification and let the 60-day window lapse.' },
      { zh: '文件申請時間太長,拿到時已經超過 60 天。', en: 'Document takes too long to obtain — arrived after the 60-day window closed.' },
      { zh: '中間有假期 / 請假 / 文件遺失,補件沒及時。', en: 'Holidays / leave / lost documents delayed re-submission.' },
    ],
    nextSteps: [
      { zh: '**立即**補齊所有缺件,並上傳 Seller Central(延期已過不會再核准,但帳號合規後系統會自動解除限制)。', en: 'Compile and upload ALL missing documents immediately. Extensions are not granted, but once the account becomes compliant, the system will auto-lift restrictions.' },
      { zh: '檢查所有 Performance Notification,確認沒有遺漏的文件要求。', en: 'Review every Performance Notification to ensure nothing was missed.' },
      { zh: '以後設 30 天的日曆提醒,收到 KYC 通知當週就開始準備。', en: 'Set a 30-day calendar reminder; start preparing documents within the same week you receive a KYC request.' },
      { zh: '文件都齊全後,耐心等系統審核(通常 2-5 工作天),不用再開 case。', en: 'After all documents are uploaded, wait 2-5 business days for the system to review — no need to open additional cases.' },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_PROCESS],
  },
  {
    id: 'pending_threshold_triggered',
    title: {
      zh: '達到撥款門檻,觸發完整 KYC (PendingThreshold)',
      en: 'Hit disbursement threshold — full KYC triggered (PendingThreshold)',
    },
    summary: {
      zh: '你之前只通過了簡化驗證,可以撥款到大約 EUR 15,000 上限。現在超過這個額度,系統觸發完整 KYC(First Time KYC),要補交完整文件。',
      en: "You previously passed simplified verification, allowing disbursements up to ~EUR 15,000. Once over that threshold, full KYC (First Time KYC) is automatically triggered and full documentation is required.",
    },
    patterns: [
      { regex: /pending\s*threshold/i, weight: 10 },
      { regex: /simplified\s+verification/i, weight: 9 },
      { regex: /(?:first\s+time|initial)\s+KYC/i, weight: 8 },
      { regex: /\bFTKYC\b/i, weight: 10 },
      { regex: /disbursement\s+threshold/i, weight: 9 },
    ],
    causes: [
      { zh: '起初只做了簡化驗證就開始賣,沒意識到有 15,000 EUR 的累積撥款上限。', en: "Started selling after simplified verification, unaware of the ~EUR 15,000 cumulative cap." },
      { zh: '跨過門檻那天起系統會自動停止撥款,直到完整 KYC 通過。', en: "Disbursements stop automatically the moment the threshold is crossed until full KYC passes." },
    ],
    nextSteps: [
      { zh: '回到 Seller Central 看 Performance Notification,列出 First Time KYC 要求的完整文件清單。', en: "Check Performance Notifications for the complete First Time KYC document list." },
      { zh: '準備一份「原先沒提交的」完整版:公司登記、BO 身分證 + POA、銀行證明信、LoA 等。', en: 'Prepare the full set you skipped originally: company registration, BO IDs + POA, bank letter, LoA etc.' },
      { zh: '一次上傳完整,一份缺就會繼續拖(現在帳款都卡住了,越快越好)。', en: 'Upload the full set in one go — missing even one means continued hold on your funds.' },
      { zh: '提交後 Seller Central 狀態會從 PendingThreshold → Compliant,屆時撥款自動恢復。', en: 'After acceptance, status moves from PendingThreshold → Compliant; disbursements auto-resume.' },
    ],
    sources: [SRC_EXPERIENCE_KYC_PROCESS],
  },
  {
    id: 'listings_disbursements_blocked',
    title: {
      zh: 'Listing / 撥款被自動封鎖',
      en: 'Listings / disbursements auto-blocked',
    },
    summary: {
      zh: '你的 listing 消失、撥款被擋,通常是 KYC 文件缺件 + 超過 60 天自動觸發,或 PendingThreshold。',
      en: "Your listings are down and disbursements are held. Usually triggered by missing KYC documents past the 60-day window, or PendingThreshold.",
    },
    patterns: [
      { regex: /disbursements?\s+(?:will\s+be\s+|are\s+)?disallowed|on\s+hold/i, weight: 8 },
      { regex: /listings?\s+(?:will\s+be\s+|are\s+)?(?:disallowed|removed|taken\s+down)/i, weight: 8 },
      { regex: /selling\s+privileges?\s+(?:have\s+been\s+)?removed/i, weight: 8 },
      { regex: /account\s+(?:has\s+been\s+)?suspended/i, weight: 7 },
      { regex: /unable\s+to\s+(?:sell|disburse)/i, weight: 6 },
    ],
    causes: [
      { zh: 'KYC 要求的文件超過 60 天沒補,系統自動停掉 listing + 撥款。', en: 'KYC document request passed the 60-day window, auto-triggering listing + disbursement blocks.' },
      { zh: '達到 PendingThreshold 門檻,系統自動擋撥款等待完整 KYC。', en: 'Hit PendingThreshold; system auto-blocks disbursements pending full KYC.' },
      { zh: '後台資訊變更觸發重新驗證,文件還沒補齊就被先擋。', en: 'Info change triggered re-verification; documents not yet complete when block kicked in.' },
    ],
    nextSteps: [
      { zh: '**先看 Performance Notifications**,不要看 Identity Information tab,那裡的資訊常過時。', en: "Check Performance Notifications FIRST — don't rely on the Identity Information tab; it's often outdated." },
      { zh: '列出**所有**缺件,一次上傳全部。分批交會拖延審核時間。', en: 'List EVERY missing document and upload all at once — batching delays review.' },
      { zh: '上傳後等 2-5 工作天讓系統審,這段時間不用再開 case 催促。', en: 'Wait 2-5 business days after upload; no need to open additional cases during that window.' },
      { zh: '若 5 天後還沒動靜,再透過 Seller Central 的 Contact Us 提 case,附上所有上傳紀錄與時間戳。', en: "If nothing happens after 5 days, open a Contact Us case in Seller Central with upload timestamps as evidence." },
    ],
    sources: [SRC_KYC_HELP, SRC_EXPERIENCE_KYC_PROCESS],
  },

  // ============================================================
  // Section 6: Navigation / scope confusion
  // ============================================================
  {
    id: 'wrong_marketplace_notification',
    title: {
      zh: '看錯 Marketplace(通知不在你看的那個站點)',
      en: "Looking at the wrong marketplace",
    },
    summary: {
      zh: 'Amazon 的 KYC 通知只會送到你的「主 marketplace」(home marketplace),不是所有站點。你可能在 UK 站點找,但通知其實在 DE 站點。',
      en: "KYC notifications are sent to your 'home marketplace' only, not every marketplace. You may be looking in UK while the notice is actually in DE.",
    },
    patterns: [
      { regex: /home\s+marketplace/i, weight: 9 },
      { regex: /correct\s+marketplace/i, weight: 8 },
      { regex: /select\s+(?:the\s+)?(?:correct\s+)?marketplace/i, weight: 8 },
      { regex: /marketplace\s+(?:switch|selector)/i, weight: 6 },
    ],
    causes: [
      { zh: '在錯誤的 Marketplace 分頁找 Performance Notification,其實該通知在另一個站點。', en: 'Looking in the wrong marketplace tab for the Performance Notification — it is in a different site.' },
      { zh: '你家主站點(home marketplace)可能跟你認為的不同(通常是最初註冊的那個)。', en: "Your 'home marketplace' may differ from what you expect (usually the one you originally registered with)." },
    ],
    nextSteps: [
      { zh: '登入 Seller Central 後,用右上角的 Marketplace 下拉切換到其他你開的站點。', en: "In Seller Central, use the top-right Marketplace dropdown to switch between all your registered marketplaces." },
      { zh: '逐一確認每個 marketplace 的 Performance Notification,找到 KYC 通知那個站點。', en: 'Check Performance Notifications on each marketplace one by one to find the KYC notice.' },
      { zh: '通知找到後記住這是你的 home marketplace,以後所有 KYC 文件都要從這裡提交。', en: 'Once found, remember: that is your home marketplace — all future KYC actions should happen there.' },
    ],
    sources: [SRC_EXPERIENCE_NAV],
  },
  {
    id: 'check_performance_notifications',
    title: {
      zh: '應看 Performance Notification,不是 Identity Information tab',
      en: 'Check Performance Notifications, not the Identity Information tab',
    },
    summary: {
      zh: 'Seller Central 有兩處可以看 KYC 狀態:Identity Information tab 跟 Performance Notifications。**只有 Performance Notification 是正確的** — Identity tab 常過時或不完整。',
      en: "Seller Central shows KYC status in two places: the Identity Information tab and Performance Notifications. ONLY Performance Notifications is authoritative — the Identity tab is often stale or incomplete.",
    },
    patterns: [
      { regex: /performance\s+notification/i, weight: 9 },
      { regex: /identity\s+information\s+tab/i, weight: 9 },
      { regex: /source\s+of\s+truth/i, weight: 7 },
      { regex: /disregard\s+.+identity\s+information/i, weight: 10 },
    ],
    causes: [
      { zh: '你看 Identity Information tab 的「還缺什麼文件」清單,結果那是過時版本。', en: 'You followed the missing-document list in the Identity Information tab, but that list is outdated.' },
      { zh: '真正的要求寫在 Performance Notification 的 email 裡,你沒注意到。', en: 'The actual requirements are in the Performance Notification email, which you missed.' },
    ],
    nextSteps: [
      { zh: '到 Seller Central → **Performance → Performance Notifications**,找最近的 KYC 信。', en: 'Seller Central → Performance → Performance Notifications. Find the most recent KYC email.' },
      { zh: '以那封 email 裡的要求清單為準,忽略 Identity Information tab 的列表。', en: 'Treat that email as the source of truth. Ignore the Identity Information tab list.' },
      { zh: 'Performance Notification 如果寫得模糊,照我們這裡分析出的其他類別去準備,或開 case 問 Seller Support 明確列出「缺哪一個欄位」。', en: "If the notification is vague, follow the other categories here, or open a case asking Seller Support to specify exactly which field is missing." },
    ],
    sources: [SRC_EXPERIENCE_NAV, SRC_EXPERIENCE_KYC_PROCESS],
  },
  {
    id: 'vat_not_kyc_scope',
    title: {
      zh: 'VAT / 稅務問題不歸 KYC 管',
      en: 'VAT / tax questions are out of KYC scope',
    },
    summary: {
      zh: '你的問題其實是 VAT、listing、信用卡驗證或一般註冊問題,這些由 Seller Partner Support 處理,不是 KYC。',
      en: "Your question is actually about VAT, listings, credit card validation, or general registration — these are Seller Partner Support's remit, not KYC.",
    },
    patterns: [
      { regex: /\bVAT\b/i, weight: 8 },
      { regex: /value\s+added\s+tax/i, weight: 8 },
      { regex: /tax\s+(?:number|certificate|identification)/i, weight: 5 },
      { regex: /listing\s+(?:issue|problem|question)/i, weight: 5 },
      { regex: /credit\s+card\s+validation/i, weight: 7 },
      { regex: /not\s+(?:a\s+|in\s+)?KYC\s+(?:scope|team|issue)/i, weight: 9 },
      { regex: /seller\s+support|SPS/i, weight: 4 },
    ],
    causes: [
      { zh: '把 VAT 或稅務問題當成 KYC 問題,結果開錯 case 類型。', en: 'Treated a VAT / tax question as a KYC question, so the case was opened in the wrong queue.' },
      { zh: '信用卡驗證失敗也不是 KYC,那是 Seller Partner Support 的 Payment Team 處理。', en: "Credit card validation failures aren't KYC either — they go to SPS Payment Team." },
    ],
    nextSteps: [
      { zh: 'VAT / 稅號 / listing / 信用卡相關問題,改在 Seller Central → Help → Contact Us,選「Seller Support」分類。', en: 'For VAT / tax / listing / credit card issues, use Seller Central → Help → Contact Us and pick the Seller Support category.' },
      { zh: 'KYC only 處理:身分與公司驗證、BO、受益人、撥款帳戶驗證(BAV)。', en: 'KYC scope: identity / company verification, beneficial owners, bank account verification (BAV) — nothing else.' },
      { zh: '確認 Performance Notification 的標題,如果開頭寫 "Your selling account has been"... 可能是不同團隊,看清楚誰發的。', en: "Check the Performance Notification subject line — different prefixes indicate different teams (SPS vs KYC vs Account Health)." },
    ],
    sources: [SRC_EXPERIENCE_NAV],
  },
];

// ============================================================
// Classifier
// ============================================================

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
    { zh: '可能是你貼的訊息太短(請包含 Amazon 完整回覆)。', en: 'The pasted message may be too short — include the full Amazon response.' },
    { zh: '也可能是新型退件原因,我們的規則庫還沒涵蓋。', en: 'It may be a newer rejection pattern our rules have yet to capture.' },
  ],
  nextSteps: [
    { zh: '再讀一次 Amazon 的回覆,找出最關鍵的一句(他們要求什麼、說缺什麼)。', en: "Re-read the Amazon message and isolate the key sentence (what they ask for, what they say is missing)." },
    { zh: '回到「提交前預檢」頁面,對照你的主體類型,檢查有沒有遺漏文件。', en: 'Return to the Pre-Check tab and cross-check your entity type against the full document list.' },
    { zh: '若仍無頭緒,去 Seller Central 開 case,直接問 Seller Support「請明確告知我缺少什麼文件或欄位」。', en: 'If still unclear, open a Seller Central case and directly ask Seller Support: "please specify exactly which document or field is missing".' },
  ],
  sources: [
    {
      type: 'experience',
      label: { zh: '通用退件處理建議', en: 'General fallback guidance' },
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
          score += 8;
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

/** Correct escapeRegExp (previous version had a UUID as replacement — bug). */
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
