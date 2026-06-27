---
agent: meta-react-architect
task_id: "12.1"
sprint: 12
title: Large-File Upload UX — timeout fix, progress store, background upload indicator
description: Fix axios 15s timeout for large uploads, add zustand upload-progress store with top-right fixed indicator component, enable background upload that persists when modals close
status: COMPLETE
started: 2026-06-26
completed: 2026-06-26
skills_used: [react-expert, vfm-agent-company:go, vfm-agent-company:playwright]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Create uploadStore.ts (zustand)
- [x] Update useReportMutations.ts (timeout:0, onUploadProgress)
- [x] Create UploadProgressIndicator.tsx component
- [x] Mount indicator in App.tsx
- [x] Update ReportsPage.tsx (close modal on submit, let upload run in background)
- [x] Update ReportViewer.tsx (same background pattern)
- [x] tsc --noEmit + build + lint pass

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| src/features/reports/stores/uploadStore.ts | CREATE | Zustand upload progress store |
| src/features/reports/hooks/useReportMutations.ts | MODIFY | timeout:0, onUploadProgress |
| src/features/reports/components/UploadProgressIndicator.tsx | CREATE | Fixed top-right progress card |
| src/App.tsx | MODIFY | Mount UploadProgressIndicator |
| src/pages/ReportsPage.tsx | MODIFY | Close modal on submit, background upload |
| src/features/reports/components/ReportViewer.tsx | MODIFY | Close modal on submit, background upload |

## Completion Notes

- uploadStore uses `getState()` (not `useUploadStore()` hook) inside mutationFn to avoid React hook rules violations in non-component context
- timeout:0 set only on multipart axios calls; JSON metadata updates keep the 15s default
- Background upload: modals close immediately on submit when a file is present; indicator persists across navigation via App-level mount and createPortal into document.body
- Indeterminate "processing" phase uses `animate-pulse` (Tailwind built-in) — avoided adding custom keyframes to tailwind.config.ts
- tsc --noEmit: 0 errors | npm run lint: 0 warnings | npm run build: success (3.48s)
- Playwright screenshot confirmed indicator renders at fixed top-right with filename, progress bar at 67%, and phase label
