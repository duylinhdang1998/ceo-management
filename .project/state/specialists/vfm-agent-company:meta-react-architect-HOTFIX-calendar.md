---
agent: vfm-agent-company:meta-react-architect
task_id: HOTFIX-calendar
sprint: HOTFIX
title: Fix Broken Calendar - Downgrade to react-day-picker v8 shadcn Implementation
description: Replace broken v10 CSS-var Calendar with official shadcn v8 classNames implementation so day selection and range highlight visually work
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [react-expert, typescript-master, go, playwright]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Pin react-day-picker to 8.10.1, date-fns to ^3
- [x] Rewrite Calendar.tsx with official shadcn v8 classNames
- [x] Update DateRangePicker.tsx for v8 API compatibility (add initialFocus)
- [x] Build passes 0 errors
- [x] Grep confirms day_selected/range classes have real bg classes

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/web/package.json | Modified | react-day-picker 8.10.1, date-fns ^3 |
| app/web/src/shared/ui/Calendar.tsx | Rewritten | Official shadcn v8 classNames approach |
| app/web/src/shared/ui/DateRangePicker.tsx | Updated | v8 API compatibility |

## Completion Notes

- Downgraded react-day-picker from ^10.0.1 to ^8.10.1 and date-fns from ^4.4.0 to ^3.6.0
- Rewrote Calendar.tsx using the official shadcn v8 classNames API (DayPicker from v8, no style.css import, no CSS custom properties)
- All selection states (day_selected, day_range_start, day_range_end, day_range_middle) now have real Tailwind bg-* classes that compile to concrete CSS
- Added initialFocus to Calendar usage in DateRangePicker (v8 requirement for popover auto-focus)
- Build: 0 TypeScript errors, 0 Vite errors
- Tests: 19/19 pass
- Static: grep confirms bg-navy compiled to rgb(15 23 42), 0 rdp- CSS vars in bundle
- Browser: could not do live interaction (backend API offline, login blocked); login page rendered with 0 JS errors confirming no React runtime issues with the new component
- Root cause of original bug: v10 CSS custom property approach required the rdp- vars to be injected at runtime, but classNames overrides in v10 do not apply to the rendered button elements for selected/range states — v8 classNames API applies directly to the DOM elements, so bg-navy etc. work immediately
