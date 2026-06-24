---
agent: vfm-agent-company:meta-react-architect
task_id: "9.1"
sprint: 9
title: "Email report popup, smaller attach button, employee count fix, assigneeCount column"
description: Add report-popup to email composer, shrink attach button, fix employee StatCard, add assigneeCount column to ReportList
status: COMPLETE
started: 2026-06-25
completed: 2026-06-25
skills_used: [react-expert, typescript-master, playwright]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Task 1 — Replace inline ReportSelector with popup Dialog + useAssignedReports hook
- [x] Task 2 — Shrink AttachmentPicker button
- [x] Task 3 — CeoDashboard employee count via useUsers
- [x] Task 4 — Add assigneeCount to Report type + ReportList column
- [x] Build passes 0 errors

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/web/src/shared/types/report.types.ts | Edit | add assigneeCount?: number |
| app/web/src/features/email/hooks/useAssignedReports.ts | Create | new hook |
| app/web/src/features/email/components/ReportAttachPopup.tsx | Create | popup dialog component |
| app/web/src/features/email/components/AiEmailComposer.tsx | Edit | wire popup, remove inline selector |
| app/web/src/features/email/components/AttachmentPicker.tsx | Edit | shrink button |
| app/web/src/features/dashboard/components/CeoDashboard.tsx | Edit | real employee count |
| app/web/src/features/reports/components/ReportList.tsx | Edit | add assigneeCount column |

## Completion Notes

- Task 1: Created `useAssignedReports` hook (GET /api/reports?assignedTo=&search=&page=) and `ReportAttachPopup` (Dialog with search + paginated list). Wired into `AiEmailComposer` replacing the inline `ReportSelector`. Button disabled with tooltip "Chọn người nhận trước" when no recipient. Chip shown when report selected with X to deselect.
- Task 2: Shrank `AttachmentPicker` button with `h-7 px-sm py-0 text-[12px]` + `Paperclip size={12}`, wrapped in Tooltip.
- Task 3: Added `useUsers({ limit: 1 })` to `CeoDashboard`, displays `data.meta.total` (verified: shows 5).
- Task 4: Added `assigneeCount?: number` to `Report` interface; added "Số NV được gán" column before actions in `ReportList`.
- Cleaned up `EmailPage.tsx` — removed now-unused `useReports` import and `reports` prop pass.
- Build: `tsc -b && vite build` — 0 errors. Tests: 19/19 green.
- Browser verified via Playwright: dashboard shows "5" employees; reports table has assigneeCount column; email popup opens "Chọn báo cáo đính kèm" with search; disabled state shows "Chọn người nhận trước" tooltip.
