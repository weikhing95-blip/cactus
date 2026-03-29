# Cactus — Product Requirements Document

**Version:** 0.1  
**Date:** 2026-03-29  
**Status:** Living Document

---

## 1. Product Overview

**Cactus** is a Southeast Asia cultural localization tool that takes English-language content and adapts it to feel genuinely local in Singapore, Malaysia, and Indonesia — not just translated, but culturally resonant.

### The Problem

Global and regional brands routinely produce English content and then run it through generic translation tools. The output is accurate but feels foreign — it doesn't use local slang particles (lah, leh, dong, banget), cultural references (hawker centres, mamak stalls, ojek culture), or the natural code-switching locals use daily. The result: copy that reads as "from HQ" instead of "one of us."

### The Solution

Cactus combines market-specific localization guides (covering Singlish, Manglish/Bahasa Malaysia, and Bahasa Indonesia/Jakarta slang) with a configurable tone and domain system, powered by Claude AI. Users paste copy or upload an image containing text, pick their market + domain + tone, and receive culturally adapted content plus annotated cultural notes explaining every adaptation.

---

## 2. Target Users

| Persona | Description | Primary Use Case |
|---|---|---|
| **Regional Marketing Manager** | Running campaigns across SG/MY/ID from a central team | Adapt English brand copy for local markets without hiring 3 copywriters |
| **Content Creator / Social Media Manager** | Managing brand social accounts for a specific SEA market | Get locally resonant captions, hooks, and short-form copy fast |
| **Legal & Compliance Team** | Localizing T&Cs, disclosures, or regulatory notices | Adapt formal legal language to be locally understandable while staying accurate |
| **SME / Startup Founder** | Running a lean team across SEA | One tool to do what a cultural consultant would charge heavily for |
| **Advertising Agency** | Working with regional clients | Rapid cultural QA of copy before client handoff |

---

## 3. Current Features (v0.1)

### Core Localization Engine
- **3 Target Markets:** Singapore (Singlish), Malaysia (Manglish/Bahasa Malaysia), Indonesia (Bahasa Indonesia/Jakarta slang)
- **3 Domains:** Marketing, Legal, Casual/Social — each with domain-specific tone guidance baked into the AI system prompt
- **3 Tones:** Professional, Casual, Playful — controls how liberally slang and particles are applied

### Content Input
- **Text input:** Free-text textarea, 500-word limit with live word counter
- **Image upload:** Drag-and-drop or file browser; JPG/PNG/GIF/WEBP up to 5MB
- **Image text extraction:** Claude extracts all visible text from uploaded images (ads, banners, packaging, screenshots) before localizing

### Output
- **Adapted Content panel:** The localized copy, with copy-to-clipboard button
- **Cultural Notes panel:** 3–7 annotated notes explaining each cultural adaptation and why it works
- **Extracted Text panel (image mode only):** Verbatim text extracted from uploaded image, shown in monospace for reference

### UX
- Sticky header with market badge
- Loading state with contextual spinner copy ("Extracting & Localizing…" vs "Localizing…")
- File validation with user-facing error messages (type, size)
- Image preview with remove option
- Mobile-responsive layout (Tailwind, single-column on small screens, 2-col grid on lg+)

---

## 4. Known Issues / Bugs Fixed

### Bug 001 — Model 404 (Critical, Fixed in v0.1)

**Issue:** The API route (`src/app/api/localize/route.ts`) was configured to use `claude-3-5-sonnet-20241022`. This model returned HTTP 404 for certain API tier accounts, causing all localization requests to fail with an internal server error.

**Root cause:** `claude-3-5-sonnet-20241022` is not universally available across Anthropic API tiers.

**Fix:** Changed model to `claude-3-haiku-20240307`, which:
- Is available on all API tiers
- Supports vision/image inputs (required for image upload feature)
- Is cost-efficient for this use case

**Commit:** `5859a78` — "Fix model 404 bug, improve error handling, QA pass"

---

### Bug 002 — Raw API Error Exposed to User (UX, Fixed in v0.1)

**Issue:** When the API returned an error, the raw error message (including internal API error strings like model names, status codes, or Anthropic SDK messages) was displayed directly in the UI's error banner.

**Fix:** 
- On non-OK responses, the technical error detail is now logged to `console.error` only
- The user sees a generic friendly message: "Something went wrong. Please try again."
- Unexpected client-side errors (network failures, parse errors) are also logged to console

---

## 5. Feature Backlog

### P0 — Critical (Must Fix Before Growth)

| ID | Feature | Rationale |
|---|---|---|
| P0-01 | Rate limiting on `/api/localize` | Unprotected endpoint can be abused; no auth means unlimited free usage |
| P0-02 | API key server-side validation | Currently trusts `.env.local`; no guard if key is revoked or quota exceeded — error handling surfaces generic 500 |
| P0-03 | Input sanitization | Content field does basic length-check but no XSS/injection hardening at the API layer |

### P1 — High Priority

| ID | Feature | Rationale |
|---|---|---|
| P1-01 | Auth / User Accounts | Required for usage tracking, saved history, and any billing model |
| P1-02 | Export to PDF / Word | Most professional users need to export adapted copy into proposals, briefs, or decks |
| P1-03 | Batch processing | Marketing teams adapt 10–50 copy variants at a time; single-submit UX is a bottleneck |
| P1-04 | History / saved results | Users want to revisit and compare past localizations |
| P1-05 | Copy comparison view | Side-by-side original vs adapted, useful for approval workflows |

### P2 — Medium Priority

| ID | Feature | Rationale |
|---|---|---|
| P2-01 | Brand Voice Profiles | Allow users to save a custom tone guide (e.g. "our brand never uses lah, but always uses wah") that overrides defaults |
| P2-02 | Language Toggle (English + Native) | Output option to show bilingual version (e.g. English + Bahasa Malaysia) for markets that prefer bilingual content |
| P2-03 | Glossary / Term Lock | Lock specific product names, legal terms, or branded phrases from being adapted |
| P2-04 | Multi-market simultaneous output | Adapt the same copy for SG + MY + ID in one click, shown in 3 tabs |
| P2-05 | Usage dashboard | Token/request tracking per user for teams to manage costs |

### P3 — Nice to Have

| ID | Feature | Rationale |
|---|---|---|
| P3-01 | Landing page | Currently goes straight to the tool; a proper landing page is needed for SEO and conversion |
| P3-02 | Stripe billing | Freemium model with credit packs or monthly subscription |
| P3-03 | API access | Let agencies and enterprise customers integrate Cactus into their own workflows |
| P3-04 | Slack / Notion integration | One-click localize from inside the tools teams already use |
| P3-05 | Thai / Vietnamese / Filipino expansion | Expand beyond SG/MY/ID to cover broader SEA |

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js 16 App                 │
│                                                 │
│  ┌──────────────┐     ┌──────────────────────┐  │
│  │  page.tsx    │────▶│ /api/localize/route  │  │
│  │  (React UI)  │◀────│ (Next.js API Route)  │  │
│  └──────────────┘     └──────────┬───────────┘  │
│                                  │               │
└──────────────────────────────────┼───────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │  Anthropic API  │
                         │  claude-3-haiku │
                         │  -20240307      │
                         └─────────────────┘
```

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 18, Tailwind CSS 3 |
| AI | Anthropic Claude API (`@anthropic-ai/sdk ^0.27`) |
| Model | `claude-3-haiku-20240307` (vision-capable) |
| Language | TypeScript 5 |
| Deployment | Node.js 20+ (any Next.js-compatible host) |

### Key Design Decisions

- **Multipart form data for image uploads** — avoids base64 bloat in JSON requests; File API handled server-side
- **System prompt architecture** — market + domain + tone guides are composed at runtime into a single system prompt; easy to add new markets without changing API contract
- **JSON-only AI response** — Claude is instructed to return only valid JSON; response is stripped of markdown fences before parsing
- **Stateless** — no database, no sessions; each request is fully self-contained (intentional for v0.1 simplicity)

---

## 7. Quality Standards

### Pre-Release Checklist (every release)

**API Route (`/api/localize`)**
- [ ] Model name is valid and available (`claude-3-haiku-20240307` or newer equivalent)
- [ ] All input validation present: market, domain, tone enum checks
- [ ] Image validation: accepted MIME types, size limit enforced
- [ ] Error responses return structured `{ error: string }` JSON with appropriate HTTP status codes
- [ ] JSON parsing of AI response is wrapped in try/catch with fallback error
- [ ] Response shape validated (`adapted_content`, `cultural_notes` array) before returning to client
- [ ] No raw Anthropic SDK errors exposed in 500 responses

**Frontend (`page.tsx`)**
- [ ] User-facing error messages are human-readable (no raw API strings or stack traces)
- [ ] Technical errors logged to `console.error` for debugging
- [ ] Word counter accurate and disables submit when over limit
- [ ] Image removal clears file input ref and revokes object URL (no memory leak)
- [ ] Loading state disables submit button and shows spinner
- [ ] Results section shows correctly for: text-only, image-only, and image+text inputs
- [ ] Extracted text panel only shown when `extracted_text` is present in response

**Build**
- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] No ESLint errors (run `npm run lint`)
- [ ] `.env.local` contains `ANTHROPIC_API_KEY` (not `CLAUDE_API_KEY` or other variants)

**Manual Smoke Tests**
- [ ] Text-only localization works for all 3 markets × 3 domains × 3 tones
- [ ] Image upload and extraction works for JPG/PNG
- [ ] Oversized file (>5MB) rejected with user-friendly error
- [ ] Wrong file type rejected before upload
- [ ] 500-word limit enforced (submit disabled when over)
- [ ] Copy-to-clipboard works
- [ ] Mobile layout renders correctly (single-column, no overflow)
