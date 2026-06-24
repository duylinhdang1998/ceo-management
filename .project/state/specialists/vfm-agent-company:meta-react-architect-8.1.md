---
agent: vfm-agent-company:meta-react-architect
task_id: 8.1
sprint: 8
title: UI Polish — Notes Drawer Facebook-style Comments
description: Restyle notes/comments drawer with Facebook bubble layout, fix reply input ordering, increase spacing, remove borders
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [react-expert, go, simplify]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read all notes feature files (NoteItem, NoteForm, NotePanel, EmployeeThreadView, AdminThreadsView)
- [x] Read tailwind design tokens
- [x] Fix NoteItem: bubble styling + reply form after children
- [x] Fix NoteForm: composer styling
- [x] Fix spacing in EmployeeThreadView and AdminThreadsView
- [x] Verify build passes (0 errors)
- [x] Tests green (19/19)
- [x] Simplify pass applied

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/web/src/features/notes/components/NoteItem.tsx | Modified | FB bubble layout; avatar+bubble row; reply form moved after children block |
| app/web/src/features/notes/components/NoteForm.tsx | Modified | rounded-2xl bg-ghost-hover composer, border-transparent at rest |
| app/web/src/features/notes/components/NotePanel.tsx | Modified | Loading skeleton restyled as bubble shapes; composer split to its own conditional |
| app/web/src/features/notes/components/EmployeeThreadView.tsx | Modified | gap-md → gap-[16px] between root comments |
| app/web/src/features/notes/components/AdminThreadsView.tsx | Modified | gap-sm → gap-[12px] per-thread, gap-md → gap-[16px] between notes |

## Completion Notes

Key decisions:
- Bubble uses `bg-ghost-hover` (#F1F5F9) — existing design token, no new values.
- Reply form block is placed in JSX AFTER the children block (lines 171-197 in final file), fixing the top-vs-bottom ordering bug.
- Avatar: depth=0 uses h-8 w-8 navy; depth=1 uses h-6 w-6 sage — consistent with AdminThreadsView thread owner avatar.
- Left connector on replies: `border-l-2 border-nav-border` with `ml-[40px]` (avatar width 32px + gap 8px).
- Simplify pass removed one dead ternary (`depth > 0 ? 'gap-[10px]' : 'gap-[10px]'`).
- Build: 0 TypeScript errors. Tests: 19/19 green.
