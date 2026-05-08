---
inclusion: always
---

# 來源標註原則 (Source Attribution Rule)

本專案是給 Amazon 賣家使用的 KYC 工具。賣家會根據這裡的資訊做「要不要送件、送什麼件」的決定,若資訊有誤,可能導致帳號被鎖、資金被凍結。**任何關於 KYC 要求、規則、退件原因、文件規格的資訊都必須有可追溯的依據。**

同時,**Amazon 內部資料(內部 wiki、特定 case 細節)絕對不能直接顯示給賣家**。我們只能用它來核實規則的正確性,不能把它曝光出去。

## 核心分流:公開來源 vs 內部參考

每個 `ChecklistItem` 有兩個獨立欄位:

```ts
interface ChecklistItem {
  // ...
  sources: Source[];           // 公開給賣家看的,必填,至少 1 筆
  internalRefs?: Source[];     // 內部核實用,不渲染到 UI,永遠不會被賣家看到
}
```

### `sources`(公開,會 render 在卡片裡)

**只允許這兩種 `type`**:

| `type` | 使用時機 | 範例 |
|---|---|---|
| `official` | Amazon Seller Central Help / 各國政府官方網站 / 官方法規 | Amazon EU KYC Help page、經濟部商業司登記 |
| `experience` | 匿名化的業務經驗整理,**不能提及具體 case 編號、公司名、內部文件名** | 「多起 2024–2025 EU KYC 退件案例顯示...」 |

**禁止**:公開 `sources` 裡出現 `internal_wiki` 或 `case_evidence`。程式碼有 invariant 會擋下來。

### `internalRefs`(內部,絕不 render)

`internal_wiki` 與 `case_evidence` 類型只能放這裡。用途:

- 讓我自己之後回頭查「這條規則到底根據什麼內部資料寫的」
- 讓同事 review 程式碼時可以核實
- 未來規則改版時有追溯路徑

**絕對不要**在 `internalRefs` 中寫入:
- Amazon 內部完整 URL / wiki path
- 任何客戶個資(PII)、email 地址
- 完整 case ID(可寫時間段 + 案件性質即可,例如「2026-04 BAV 退件案」)

即使是 `internalRefs`,也只寫「誰會想得起這是哪份文件」級別的短描述。

## Source 結構

```ts
interface Source {
  type: 'official' | 'internal_wiki' | 'case_evidence' | 'experience';
  label: Bilingual;
  url?: string;          // 只有 official 允許帶 url。internal 一律不帶。
  retrievedAt?: string;  // YYYY-MM-DD
  note?: Bilingual;
}
```

## 撰寫檢查清單(每次寫 / 改 item 前)

- [ ] `sources` 至少 1 筆,且只有 `official` 或 `experience`
- [ ] 若原本只有內部資料,至少寫一則匿名化的 `experience` 放 `sources`
- [ ] 內部資料全部放 `internalRefs`
- [ ] `official` 來源附 `url`、`retrievedAt`
- [ ] 高風險內容(例如「常見退件原因」)至少有一筆 `experience` 或 `official` 撐
- [ ] `internalRefs` 的文字裡**沒有**具體 URL、case 編號、個資、公司全名

## UI 規則

- 只有 `sources` 會 render
- 每個 source 用對應顏色 badge:`official` 綠 / `experience` 灰
- `official` 有 url 就做超連結
- 底部永遠有:「本工具整理自 Amazon Seller Central 公開指引與匿名化的實際審核案例歸納。最終審核以 Amazon 當下公告為準。」

## 不確定性處理

當我只能靠內部觀察,沒有官方公告佐證時:

1. 在 `sources` 寫一則 `experience`,用匿名語氣表達(例:「多起 2025 EU KYC 案例觀察」)
2. 把內部文件原文放到 `internalRefs`,`type: 'internal_wiki'`
3. 卡片 UI 會自動因為這是 `experience` 而帶灰色「經驗整理」標記,賣家知道這不是官方白紙黑字

寧可降低公開版的確信度,也不要讓賣家誤以為有 Amazon 官方背書。

## 提醒

- 我不是 Amazon 員工,沒有最終審核權
- 每個頁面底部都標「僅供參考,最終以 Amazon 審核為準」
- 規則定期(至少每季)回頭查官方文件有沒有更新,寫 TODO
