# Changelog

All notable changes to Pass KYC will be documented here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

---

## v0.1.0-beta — 2026-05-08

First internal beta release. Sharable to teammates for live testing.

### Added
- **Module ① Wizard** — 5-question pre-submission self-check producing a tailored
  document checklist with public sources (official / experience) per item.
- **Module ③ After Reject** — paste an Amazon rejection message, get:
  - Classification into one of 7 known patterns (BAV authenticity, missing fields,
    name mismatch, document quality, info-change re-verification, incomplete BOs,
    address inconsistency) with confidence signals and alternatives.
  - Likely causes and ordered next steps.
  - Bilingual (ZH / EN) reply drafts modeled on Amazon's own boilerplate.
- **Module ③ editor** — users can edit category summary / causes / next steps /
  reply subject & body / extra match keywords. All overrides persist in the
  browser's `localStorage` and can be exported / imported as JSON.
- **i18n** — ZH / EN with instant language switcher; URL `?lang=zh|en` supported.
- **Source attribution** — every rule carries public `sources` (official + experience
  only). Internal references (`internal_wiki` / `case_evidence`) are kept separate
  and never rendered to the UI; a build-time invariant enforces this.

### Known limitations
- **Module ② Doc Check** — current OCR-based auto-extract approach proved unreliable
  on real scanned bank letters; a redesign ("seller fills → OCR verifies") is in
  progress for v0.2.
- Rule coverage is intentionally conservative (7 rejection patterns); richer
  coverage is planned for v0.2.
