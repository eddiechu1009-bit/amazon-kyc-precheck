import type { Bilingual } from './types';
import type { RejectionCategory } from './rejectionPatterns';
import { loadOverrides } from './customRules';

/**
 * Neutral, professional reply templates for sellers responding
 * to Amazon Seller Support after a rejection.
 *
 * Language is modelled on Amazon's own boilerplate phrasing
 * (which sellers can safely echo back). Case IDs and seller
 * details are placeholders the user will fill in.
 */

export interface ReplyTemplate {
  subject: Bilingual;
  body: Bilingual;
}

const TEMPLATE_BAV_RESUBMIT: ReplyTemplate = {
  subject: {
    zh: '【補件】Bank Account Verification — Case {CASE_ID}',
    en: 'Re-submission: Bank Account Verification — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝先前的回覆。我已依照您說明的要求,重新向銀行申請了一份原始、未經編輯的正式銀行證明信 (Certified Bank Letter),這份文件已符合下列全部要求:

  1. 開立日期在近 180 天內
  2. 顯示銀行名稱與銀行 Logo
  3. 由銀行人員親筆簽名或蓋章(非數位加註)
  4. 含帳戶持有人姓名、居住地址、完整銀行帳號

這份文件除了依貴方指引遮蓋帳戶餘額外,其餘欄位均保留銀行原始內容,未做任何編輯或修改。

我已經從 Seller Central 的 Deposit Methods 頁面按「Retry」重新上傳,請協助進行驗證。若文件仍有任何不足之處,煩請具體指出缺少哪一項欄位,以便我們再次向銀行請求補充。

Case ID: {CASE_ID}
相關帳戶末四碼: {ACCOUNT_LAST_4}

謝謝您的協助。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for your previous response. Per the requirements you specified, I have obtained an original, unedited certified bank letter from our bank. The document now meets all of the following:

  1. Dated within the last 180 days
  2. Shows the bank name and bank logo
  3. Signed or stamped by the bank with an original signature (not digitally added)
  4. Includes the account holder's name, residential address, and full bank account number

Other than redacting the account balance as permitted by Amazon's policy, all other fields remain original and unedited as issued by the bank.

I have uploaded the new document via the "Retry" button on the Deposit Methods page in Seller Central. Please proceed with verification.

If anything is still missing, kindly specify exactly which field is insufficient so we can request the right supplement from the bank.

Case ID: {CASE_ID}
Account ending in: {ACCOUNT_LAST_4}

Thank you for your assistance.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_NAME_MISMATCH: ReplyTemplate = {
  subject: {
    zh: '【說明】帳戶持有人姓名一致性 — Case {CASE_ID}',
    en: 'Clarification: Account holder name consistency — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝您指出帳戶持有人姓名比對的問題。我已重新確認,並將所有文件與 Seller Central 後台的名稱統一為以下一致版本:

  官方名稱(以公司設立登記表為準): {OFFICIAL_NAME}
  銀行帳戶持有人: {BANK_HOLDER_NAME}
  Seller Central 註冊名稱: {SELLER_CENTRAL_NAME}

上述三者現已完全一致。我已在 Deposit Methods 頁面重新提交最新的銀行文件,煩請再次審核。

若之後仍認為有差異,請具體指出差異發生在哪兩份文件之間、哪一個欄位,以便我們精確處理。

Case ID: {CASE_ID}

謝謝。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for flagging the account holder name comparison. I have rechecked and aligned every document with the name registered in Seller Central as follows:

  Official name (per Company Registration): {OFFICIAL_NAME}
  Bank account holder: {BANK_HOLDER_NAME}
  Seller Central registration: {SELLER_CENTRAL_NAME}

All three now match exactly. The updated bank document has been re-submitted via the Deposit Methods page for another review.

If any mismatch is still identified, please specify between which two documents and which field so we can address it precisely.

Case ID: {CASE_ID}

Thank you.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_BO_INCOMPLETE: ReplyTemplate = {
  subject: {
    zh: '【補件】受益人 (Beneficial Owner) 完整資料 — Case {CASE_ID}',
    en: 'Re-submission: Complete Beneficial Owner documents — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝指出受益人資料尚未完整的問題。我已依公司設立登記表上列出的全部受益人,重新提供如下文件:

  受益人 1 — {BO1_NAME}:身分證明正反面 + 90 天內地址證明
  受益人 2 — {BO2_NAME}:身分證明正反面 + 90 天內地址證明
  受益人 3 — {BO3_NAME}:身分證明正反面 + 90 天內地址證明

(若實際受益人少於 3 位,請酌情刪減對應行數)

所有受益人姓名拼音已對齊公司登記版本。Seller Central 的「我已新增該公司所有的受益人」選項已勾選為 Yes。

Case ID: {CASE_ID}

謝謝。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for flagging the incomplete beneficial owner documentation. I have re-submitted the following for every BO listed on the Company Registration:

  BO 1 — {BO1_NAME}: ID (both sides) + proof of address within 90 days
  BO 2 — {BO2_NAME}: ID (both sides) + proof of address within 90 days
  BO 3 — {BO3_NAME}: ID (both sides) + proof of address within 90 days

(Remove rows above if you have fewer than three beneficial owners.)

All BO name romanizations are aligned with the Company Registration. The "I have added all beneficial owners: Yes" confirmation has been selected in Seller Central.

Case ID: {CASE_ID}

Thank you.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_ADDRESS: ReplyTemplate = {
  subject: {
    zh: '【說明】地址一致性 — Case {CASE_ID}',
    en: 'Clarification: Address consistency — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝您指出地址一致性的問題。我已選定以下英文標準地址作為所有文件與 Seller Central 後台的統一版本:

  標準地址: {CANONICAL_ADDRESS}

所有提交的文件(公司登記、身分證明、銀行對帳單、地址證明)均已對齊此版本,無多餘空格、標點或譯法差異。後台資料亦同步更新。

Case ID: {CASE_ID}

若仍認為有不一致,請具體指出發生在哪兩份文件之間。

謝謝。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for flagging the address consistency issue. I have chosen the following canonical English address and aligned every document and Seller Central to it:

  Canonical address: {CANONICAL_ADDRESS}

All submitted documents (company registration, ID, bank statement, proof of address) now match this version with no stray spaces, punctuation, or translation variations. Seller Central has been updated accordingly.

Case ID: {CASE_ID}

If any inconsistency remains, please specify between which two documents.

Thank you.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_QUALITY: ReplyTemplate = {
  subject: {
    zh: '【補件】文件品質重新提交 — Case {CASE_ID}',
    en: 'Re-submission with improved document quality — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝指出文件清晰度問題。我已使用 300 DPI 以上的掃描器重新取得彩色掃描件,確認:

  1. 所有欄位清楚可讀,無反光、陰影、手指遮擋
  2. 文件完整,邊角未被切掉
  3. 檔案格式為彩色 PDF / PNG

新版本已提交,請協助再次審核。

Case ID: {CASE_ID}

謝謝。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for flagging the document clarity issue. I have re-scanned using a scanner at 300 DPI or higher, verifying that:

  1. Every field is clearly readable with no glare, shadows, or obstruction
  2. The document is complete with no edges cropped off
  3. The file is a color PDF / PNG

The improved version has been submitted. Please proceed with the review.

Case ID: {CASE_ID}

Thank you.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_INFO_CHANGE: ReplyTemplate = {
  subject: {
    zh: '【補件】資訊變更後文件更新 — Case {CASE_ID}',
    en: 'Re-submission following account information update — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

我了解近期的帳號資訊變更觸發了重新驗證流程。我已依變更後的最新狀態準備以下文件:

  1. 反映新地址的地址證明 (90 天內開立)
  2. 反映新資訊的銀行對帳單 / 證明信
  3. 其他您所要求的補充文件

所有文件的姓名、公司名稱、地址皆已完全符合目前後台最新狀態。

Case ID: {CASE_ID}

謝謝。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

I understand that the recent account information update has triggered a re-verification. I have prepared the following documents reflecting the updated state:

  1. Proof of address reflecting the new address (issued within the last 90 days)
  2. Bank statement / certified letter reflecting the new information
  3. Any additional supporting documents you have requested

All names, company names, and addresses on the documents now fully match the current Seller Central information.

Case ID: {CASE_ID}

Thank you.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_CLARIFICATION: ReplyTemplate = {
  subject: {
    zh: '【請協助】希望了解具體被拒原因 — Case {CASE_ID}',
    en: 'Request for clarification on rejection reason — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝您的回覆。我了解基於機密性政策,可能無法透露 verification team 的所有細節,但為了能提交正確的文件,懇請協助確認以下一項資訊:

在我上次提交的文件中,具體是「哪一個欄位」或「哪一份文件」讓系統無法通過驗證?

例如:
  - 是銀行對帳單的日期、抬頭、地址、帳號其中哪一項?
  - 還是身分證明 / POA / 公司登記的特定欄位?

我目前手上已準備多種版本的文件,若能取得這項資訊,便能精準補件,避免再次因同一問題被退。

Case ID: {CASE_ID}

由衷感謝您的協助。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for your response. I understand that due to confidentiality policies not all verification team details can be disclosed, but to submit the correct document I would greatly appreciate clarification on ONE point:

Among the documents I previously submitted, which specific FIELD or which specific DOCUMENT caused the verification to fail?

For example:
  - Was it the date / letterhead / address / account number on the bank statement?
  - Or a specific field on the ID / POA / company registration?

I currently have several versions of each document on hand. With this information I can target the exact fix and avoid another rejection for the same cause.

Case ID: {CASE_ID}

Thank you sincerely for your help.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_DEADLINE_EXPIRED: ReplyTemplate = {
  subject: {
    zh: '【補件】錯過 60 天補件期限,現已補齊全部文件 — Case {CASE_ID}',
    en: 'Re-submission: documents now complete after 60-day deadline — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝您的回覆。我了解我先前未在 60 天內補齊 KYC 要求文件,造成 Listing 與撥款被限制。我已於 {UPLOAD_DATE} 將所有先前缺件的文件上傳至 Seller Central:

  · 公司登記相關文件(含 180 天內抄本)
  · 受益人身分證明與地址證明
  · 銀行證明信(未編輯,180 天內)
  · 其他 Performance Notification 列出的文件

我了解延期不會被核准,現在只能等帳號合規後系統自動解除限制。煩請協助確認文件是否全部符合要求;若有任何一項不足,請具體告知缺哪一個欄位。

Case ID: {CASE_ID}

謝謝。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for your response. I understand that I did not submit the required KYC documents within the 60-day window, resulting in listings and disbursements being disallowed. I have now uploaded all previously missing documents to Seller Central on {UPLOAD_DATE}:

  · Company registration documents (including extract within 180 days)
  · Beneficial owner ID and proof of address
  · Bank letter (unedited, within 180 days)
  · Any other documents listed in the Performance Notification

I understand that extensions cannot be granted; I am waiting for the system to lift restrictions once the account becomes compliant. Please confirm whether every document meets the requirements, and if anything is still insufficient, kindly specify exactly which field is missing.

Case ID: {CASE_ID}

Thank you.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_THRESHOLD_TRIGGERED: ReplyTemplate = {
  subject: {
    zh: '【補件】PendingThreshold 完整 KYC 文件提交 — Case {CASE_ID}',
    en: 'Re-submission: Full KYC documents for PendingThreshold — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

我了解我的帳戶已達到 PendingThreshold,觸發完整 First Time KYC 流程。我已依 Performance Notification 列出的全部文件要求,重新提交完整文件組如下:

  · 公司設立登記表 + 180 天內抄本
  · 所有受益人 (BO) 的身分證 + 地址證明
  · 銀行正式證明信(Certified Bank Letter)
  · 授權書 (LoA) (若適用)
  · 其他 Performance Notification 列出的文件

Case ID: {CASE_ID}

我了解 Listing 與撥款會在系統判定 Compliant 後自動恢復。謝謝您的協助。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

I understand my account has hit the PendingThreshold and full First Time KYC is now required. I have submitted the complete document set per the Performance Notification requirements:

  · Company registration + extract within 180 days
  · ID + proof of address for every beneficial owner
  · Certified Bank Letter
  · Letter of Authorization (if applicable)
  · Any other documents listed in the Performance Notification

Case ID: {CASE_ID}

I understand that listings and disbursements will auto-resume once the account is marked Compliant. Thank you for your assistance.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_LOA_REDRAFT: ReplyTemplate = {
  subject: {
    zh: '【補件】重新起草授權書 (LoA) — Case {CASE_ID}',
    en: 'Re-submission: Redrafted Letter of Authorization — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝指出授權書 (LoA) 的問題。我已重新起草一份符合要求的授權書,包含以下全部要素:

  · 明確授權主要聯絡人「open, manage, and initiate transactions on the Amazon seller account」
  · 由公司法人代表 / 董事親筆簽名(非數位簽章)
  · 加蓋公司印章
  · 註明開立日期(180 天內)

新版授權書已上傳至 Seller Central,煩請協助審核。

Case ID: {CASE_ID}

謝謝。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for flagging the Letter of Authorization issue. I have redrafted a compliant LoA that includes all required elements:

  · Explicit authorization for the primary contact "to open, manage, and initiate transactions on the Amazon seller account"
  · Signed in person by the legal representative / director (not digital)
  · Company stamp applied
  · Issue date specified (within 180 days)

The new LoA has been uploaded to Seller Central. Please proceed with the review.

Case ID: {CASE_ID}

Thank you.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATE_STRUCTURE_SUBMIT: ReplyTemplate = {
  subject: {
    zh: '【補件】公司股東架構完整文件 — Case {CASE_ID}',
    en: 'Re-submission: Complete corporate ownership documents — Case {CASE_ID}',
  },
  body: {
    zh: `您好 Seller Support,

感謝指出股東結構文件不完整的問題。我已準備完整股東架構文件如下:

  · Organizational Chart — 從最終受益人到本公司,每層股權比例清楚標示
  · Articles of Association
  · Share Register / Share Certificate
  · Statement of Capital (或最新 Annual Return)
  {TRUST_IF_APPLICABLE}

所有 BO (25% 以上股份的自然人) 已一併提供身分證明與地址證明。

Case ID: {CASE_ID}

若有任何文件仍不足,請具體告知。

{YOUR_NAME}
{YOUR_COMPANY}`,
    en: `Hello Seller Support,

Thank you for flagging the incomplete shareholder structure. I have prepared a complete corporate ownership package:

  · Organizational Chart — mapping ownership % at every layer from ultimate beneficial owner to this entity
  · Articles of Association
  · Share Register / Share Certificate
  · Statement of Capital (or the latest Annual Return)
  {TRUST_IF_APPLICABLE}

ID and proof of address have been provided for every BO (natural person holding 25%+ shares).

Case ID: {CASE_ID}

If anything is still insufficient, please specify.

{YOUR_NAME}
{YOUR_COMPANY}`,
  },
};

const TEMPLATES: Record<RejectionCategory, ReplyTemplate> = {
  // BAV / bank
  bav_document_authenticity: TEMPLATE_BAV_RESUBMIT,
  bav_document_missing_fields: TEMPLATE_BAV_RESUBMIT,
  name_mismatch: TEMPLATE_NAME_MISMATCH,
  third_party_acl_invalid: TEMPLATE_BAV_RESUBMIT,
  // Quality / validity
  kyc_document_quality: TEMPLATE_QUALITY,
  document_expired_180: TEMPLATE_BAV_RESUBMIT,
  document_translation_missing: TEMPLATE_QUALITY,
  // BO / structure
  bo_incomplete: TEMPLATE_BO_INCOMPLETE,
  shareholder_structure_missing: TEMPLATE_STRUCTURE_SUBMIT,
  loa_invalid: TEMPLATE_LOA_REDRAFT,
  company_extract_expired: TEMPLATE_BAV_RESUBMIT,
  // Address / POA
  address_inconsistency: TEMPLATE_ADDRESS,
  poa_name_mismatch_holder: TEMPLATE_ADDRESS,
  poa_type_unaccepted: TEMPLATE_ADDRESS,
  // Process / status
  info_change_reverification: TEMPLATE_INFO_CHANGE,
  sixty_day_deadline_expired: TEMPLATE_DEADLINE_EXPIRED,
  pending_threshold_triggered: TEMPLATE_THRESHOLD_TRIGGERED,
  listings_disbursements_blocked: TEMPLATE_DEADLINE_EXPIRED,
  // Navigation / scope
  wrong_marketplace_notification: TEMPLATE_CLARIFICATION,
  check_performance_notifications: TEMPLATE_CLARIFICATION,
  vat_not_kyc_scope: TEMPLATE_CLARIFICATION,
  // Fallback
  unknown: TEMPLATE_CLARIFICATION,
};

export function getTemplate(category: RejectionCategory): ReplyTemplate {
  const base = TEMPLATES[category] ?? TEMPLATE_CLARIFICATION;
  const override = loadOverrides()[category];
  if (!override) return base;
  return {
    subject: override.replySubject ?? base.subject,
    body: override.replyBody ?? base.body,
  };
}

/** Get the built-in base template for UI that wants to show defaults / reset. */
export function getBaseTemplate(category: RejectionCategory): ReplyTemplate {
  return TEMPLATES[category] ?? TEMPLATE_CLARIFICATION;
}
