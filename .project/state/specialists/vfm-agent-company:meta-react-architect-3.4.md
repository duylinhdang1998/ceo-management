---
agent: vfm-agent-company:meta-react-architect
task_id: "3.4"
sprint: 3
title: Frontend AI Email Composer (CEO)
description: Build CEO-only AI email composer page with prompt-driven compose, recipient picker, attachment support, and send flow
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [react-expert, playwright]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read design system and requirements
- [x] Read shared hooks, types, existing components
- [x] Implement features/email hooks (useAiCompose, useSendEmail)
- [x] Implement AiEmailButton, RecipientPicker, AttachmentPicker
- [x] Implement AiEmailComposer (main composer)
- [x] Implement EmailPage
- [x] Export barrel (index.ts)
- [x] Build passes (npm run build)

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/web/src/features/email/hooks/useAiCompose.ts | CREATE | POST /api/email/compose mutation; types for ComposeRequest/ComposeResult/ComposeRecipient |
| app/web/src/features/email/hooks/useSendEmail.ts | CREATE | POST /api/email/send multipart mutation; FormData builder |
| app/web/src/features/email/components/AiEmailButton.tsx | CREATE | Entry CTA button; triggers onOpen callback |
| app/web/src/features/email/components/RecipientPicker.tsx | CREATE | Search+select from employee list; shows AI candidates first |
| app/web/src/features/email/components/AttachmentPicker.tsx | CREATE | Multi-file input; dedup by name+size; remove individual files |
| app/web/src/features/email/components/AiEmailComposer.tsx | CREATE | Full compose+send orchestrator; inline TextareaField + ReportSelector sub-components |
| app/web/src/features/email/index.ts | CREATE | Public barrel export |
| app/web/src/pages/EmailPage.tsx | EDIT | Replaced placeholder stub with full implementation |

## Rework Notes (2026-06-24)

- **C2** Extracted `TextareaField.tsx` and `ReportSelector.tsx` from `AiEmailComposer.tsx`; exported from barrel
- **C3** Created `shared/types/report.types.ts`; `AiEmailComposer` imports `Report` from shared (removed `@/features/reports` cross-feature import)
- **M5** Replaced all arbitrary Tailwind values (`text-[14px]`, `mb-[6px]`, `px-[14px]`, `py-[10px]`, `text-[12px]`, `text-[13px]`, `gap-[6px]`) with design-system token classes (`text-body-sm`, `mb-xs`, `px-md`, `py-sm`, `text-caption`, `gap-xs`)
- Build: 0 errors · Vitest: 19/19

## Completion Notes

**Unmatched recipient handling**: When BE returns `requiresRecipientSelection=true`, the composer
shows `RecipientPicker` which displays AI-supplied `candidates` first (labelled "Gợi ý"), then the
full employee list via `useUsers`. CEO picks one; the composer re-calls `/compose` with
`selectedRecipientId` so AI regenerates body for the correct recipient. No email is ever sent to
an unmatched or external address.

**No preview step**: Flow is prompt → compose → edit → send (per requirements). No separate preview
page.

**Report picker**: fetches published reports via `useReports({ limit: 100 })` in EmailPage; passes
the list down to `AiEmailComposer` → `ReportSelector`. Gracefully degrades to hidden if no reports.

**File attachments**: `AttachmentPicker` accumulates `File[]` objects in React state and passes
them to `useSendEmail` which appends them to FormData. Dedup by name+size prevents re-adding.

**Build**: `tsc -b && vite build` → 0 errors, 1811 modules, EmailPage-*.js in output (14.29 kB).

**Browser verification** (Playwright, headless):
- Navigated to http://localhost:5173/email as super_admin
- Page renders: sidebar (all CEO nav links), topbar "Gửi email AI", composer card
- Prompt textarea present; "Tạo nội dung" disabled until text entered — then enabled
- 0 React/JS errors; 2 ERR_CONNECTION_REFUSED (backend not running) — expected and graceful
