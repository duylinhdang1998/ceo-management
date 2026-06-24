import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

// ── Calendar ────────────────────────────────────────────────────────────────
// Verdana Health themed Calendar built on react-day-picker v8 (shadcn style).
//
// Theming strategy (v8 / shadcn):
//   All visual states are expressed via `classNames` Tailwind utilities that
//   DayPicker applies directly to the rendered HTML elements. This means
//   day_selected, day_range_start, day_range_end, day_range_middle etc. all
//   get real Tailwind classes → real CSS → the selection highlight actually
//   renders in the browser. No CSS custom properties are used.
//
// Props are passed through so callers typed as mode="range" retain the
// correct selected/onSelect discriminated union types from react-day-picker.

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function IconLeft() {
  return <ChevronLeft className="h-4 w-4" />;
}

function IconRight() {
  return <ChevronRight className="h-4 w-4" />;
}

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        // ── Layout ───────────────────────────────────────────────────────
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',

        // ── Caption (month title + nav) ───────────────────────────────────
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-[13px] font-semibold text-navy',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          'h-7 w-7 inline-flex items-center justify-center rounded-md border border-nav-border bg-surface',
          'text-helper-text opacity-50 hover:opacity-100 hover:bg-ghost-hover',
          'transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed',
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',

        // ── Grid ──────────────────────────────────────────────────────────
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-helper-text rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',

        // ── Day cells ─────────────────────────────────────────────────────
        // cell: wraps each day — handles range_middle band background
        cell: cn(
          'h-9 w-9 text-center text-sm p-0 relative',
          // When a cell is part of a range, span the full background band
          '[&:has([aria-selected].day-range-end)]:rounded-r-md',
          '[&:has([aria-selected].day-range-start)]:rounded-l-md',
          '[&:has([aria-selected].day-outside)]:bg-[#0F172A14]',
          '[&:has([aria-selected])]:bg-[#0F172A14]',
          'first:[&:has([aria-selected])]:rounded-l-md',
          'last:[&:has([aria-selected])]:rounded-r-md',
          'focus-within:relative focus-within:z-20',
        ),

        // day: the clickable button inside each cell
        day: cn(
          'h-9 w-9 p-0 font-normal',
          'inline-flex items-center justify-center rounded-md text-[13px] text-navy',
          'hover:bg-ghost-hover hover:text-navy',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-1',
          'transition-colors duration-150 cursor-pointer',
          'aria-selected:opacity-100',
        ),

        // ── Selection state classes ────────────────────────────────────────
        // These are applied to the <button> (day element) directly in v8.
        day_selected:
          'bg-navy text-white hover:bg-navy hover:text-white focus:bg-navy focus:text-white rounded-md',

        day_today:
          'bg-ghost-hover text-navy font-semibold',

        day_outside:
          'text-helper-text opacity-50 aria-selected:bg-[#0F172A14] aria-selected:text-helper-text aria-selected:opacity-30',

        day_disabled: 'text-helper-text opacity-30 cursor-not-allowed',

        // Range-specific — v8 uses day_range_start, day_range_end, day_range_middle
        day_range_start:
          'day-range-start bg-navy text-white hover:bg-navy focus:bg-navy rounded-md',

        day_range_end:
          'day-range-end bg-navy text-white hover:bg-navy focus:bg-navy rounded-md',

        day_range_middle:
          'aria-selected:bg-[#0F172A14] aria-selected:text-navy aria-selected:hover:bg-[#0F172A20] rounded-none',

        day_hidden: 'invisible',

        // Merge any caller-supplied classNames overrides
        ...classNames,
      }}
      components={{
        IconLeft,
        IconRight,
      }}
      {...props}
    />
  );
}
