# Pass KYC

**Amazon EU 賣家 KYC 提交前自助檢查工具 · Self-service KYC pre-submission checker for Amazon EU sellers**

> 在送出前先確認,而不是被退件後才補救。所有資料只留在你的瀏覽器。
> Check before you submit, not after you get rejected. Everything runs in your browser.

---

## ✨ 核心理念

| 原則 | 意義 |
|---|---|
| 🔒 **100% 瀏覽器端運算** | 賣家上傳的文件、填寫的資訊都只存在 browser,從未上傳伺服器,關閉分頁即消失 |
| 🌏 **中英雙語** | 所有文案、補件清單、回信模板都有中英兩版,右上角即時切換 |
| 📚 **來源透明** | 每條規則都附出處:Amazon 官方 Help page 或匿名化的真實退件案例歸納 |
| 🛠️ **可自訂** | 賣家可在本機編輯退件分類、下一步、回信模板;規則可匯出 JSON 分享 |
| 🚫 **非 Amazon 官方工具** | 獨立專案,最終審核以 Amazon 為準 |

---

## 🧩 三個模組

| 模組 | 用途 | 狀態 |
|---|---|---|
| 📝 **提交前預檢 (Wizard)** | 回答 5 題 → 產出客製化文件清單 | ✅ v0.1 |
| 📄 **文件自檢 (Doc Check)** | 上傳 PDF / 圖片 → 比對欄位是否齊全 | 🟡 轉型中(v0.2 規劃) |
| 🧭 **退件後 SOP (After Reject)** | 貼 Amazon 退件訊息 → 分析原因 + 中英回信草稿 | ✅ v0.1 |

---

## 🚀 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:5173/amazon-kyc-precheck/ 即可。

### Build

```bash
# GitHub Pages build (sub-path)
npm run build

# Netlify / custom domain build (root path)
DEPLOY_TARGET=netlify npm run build
```

---

## 📦 部署

### GitHub Pages(主要 beta 測試環境)
- 推到 `main` 分支會自動觸發 `.github/workflows/deploy-pages.yml`
- 部署到 `https://<user>.github.io/amazon-kyc-precheck/`
- 第一次設定:Repo → Settings → Pages → Source 選 **GitHub Actions**

### Netlify(未來對外版用)
- `netlify.toml` 已設定 `DEPLOY_TARGET=netlify` 與 SPA 重定向
- 連上 Netlify 後直接 auto deploy

---

## 🏗️ 技術棧

- React 18 + TypeScript + Vite 6
- Tailwind CSS(家族共用 `amazon-*` 色票)
- `pdfjs-dist` 瀏覽器端 PDF 解析
- `tesseract.js` 瀏覽器端 OCR
- 無後端、純靜態
- 輕量自製 i18n(無 i18next)

---

## 📁 專案結構

```
src/
├── i18n/              # 中英雙語字典
├── data/
│   ├── types.ts           # ChecklistItem / Source / 公開 vs 內部 來源型別
│   ├── kycRules.ts        # Wizard 規則(每條帶 sources 與 invariants)
│   ├── rejectionPatterns.ts  # 退件分類關鍵字庫
│   ├── replyTemplates.ts     # 中英回信模板
│   └── customRules.ts        # 使用者覆寫(localStorage)
├── components/        # UI 元件
├── lib/               # PDF / OCR / 匯出工具
└── App.tsx
```

---

## 🔐 來源標註原則

本專案**嚴格**區分公開 vs 內部資料:

- **公開** (`sources`):只能出現 `official`(Amazon 官方 Help 有 URL)或 `experience`(匿名化經驗整理)
- **內部** (`internalRefs`):`internal_wiki` / `case_evidence` 僅作程式碼審查用,**絕不**渲染到 UI,也絕不能帶 URL / case ID / 公司全名

規則庫有 build-time invariant 會在編譯時檢查,防止內部資料誤流出。

詳見 `.kiro/steering/source-attribution.md`。

---

## 🗺️ Roadmap

- [x] Module ① Wizard(提交前預檢)
- [x] Module ③ After Reject(退件分類 + 回信草稿)
- [x] Module ③ 邊用邊改(localStorage 覆寫 + 匯入/匯出)
- [x] 中英 i18n + URL `?lang=` 分享
- [ ] Module ② 轉型:「賣家填 → OCR 驗證」(不再靠 OCR 提取)
- [ ] 擴充退件分類規則庫(目標 20+ 類)
- [ ] 法律但書 / 隱私聲明獨立頁面
- [ ] 分享 URL:把 Wizard 答案編碼到 URL hash
- [ ] PDF 報告匯出
- [ ] Manus Skill 發佈

---

## 🤝 家族工具

- [EU 賣家工具箱](https://amzeuseller.netlify.app/) — 品牌註冊 / Listing / FBA / PPC checklist
- [Case 撰寫工具](https://case-writer.netlify.app/) — Case / POA 生成器
- [帳務分析工具](https://eu-accounting.netlify.app/) — 多國損益分析
- **Pass KYC**(本專案)— KYC 提交前自助檢查

---

## ⚠️ 免責

本工具為獨立開發,**非 Amazon 官方產品**,內容不代表 Amazon 立場。

- 所有規則僅供參考,**最終審核以 Amazon 當下公告為準**
- 規則庫整理時程請見 `sources` 中的 `retrievedAt`
- 不蒐集任何使用者資料,不做 analytics,不存 cookies(僅 `localStorage` 存語言與自訂規則)

詳見 [`LICENSE`](./LICENSE) 的 Data Attribution Notice。

---

© 2026 Eddie Chu · MIT License
