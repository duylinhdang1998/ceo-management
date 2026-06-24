import { type ReactNode } from 'react';

// ── Tooltip ────────────────────────────────────────────────────────────────
// Wraps a single child element and shows a tooltip on hover/focus.
//
// Design spec (Verdana Health):
//   background : #0F172A (navy)
//   text       : #F8FAFC, DM Sans 12px
//   padding    : 6px 12px
//   radius     : 8px
//   max-width  : 240px
//   arrow      : 6px triangle centered
//   delay      : ~150ms show, 0ms hide
//   a11y       : role="tooltip", aria-describedby wired automatically
//   position   : "top" (default) | "bottom"
//
// Usage:
//   <Tooltip label="Sửa">
//     <button>…</button>
//   </Tooltip>

export interface TooltipProps {
  /** The tooltip text to display */
  label: string;
  /** The element that triggers the tooltip */
  children: ReactNode;
  /** Which side the tooltip appears. Default: "top" */
  side?: 'top' | 'bottom';
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const isTop = side === 'top';

  return (
    <span
      className="relative inline-flex items-center group"
      // Keyboard focus on the wrapper itself is not needed — the child handles focus
    >
      {children}

      {/* Tooltip bubble */}
      <span
        role="tooltip"
        className={[
          // Position
          'absolute left-1/2 -translate-x-1/2 z-30',
          isTop ? 'bottom-full mb-[6px]' : 'top-full mt-[6px]',
          // Visibility — show on group-hover OR when a descendant is :focus-visible
          'pointer-events-none',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          // Transition: 150ms delay on show, instant on hide
          'transition-opacity duration-150 delay-0 group-hover:delay-150 group-focus-within:delay-150',
          // Appearance
          'whitespace-nowrap max-w-[240px] truncate',
          'rounded bg-navy px-3 py-1.5',
          'font-sans text-[12px] leading-[1.4] text-[#F8FAFC]',
          'shadow-md',
        ].join(' ')}
      >
        {label}

        {/* Arrow */}
        <span
          aria-hidden="true"
          className={[
            'absolute left-1/2 -translate-x-1/2',
            'border-[6px] border-transparent',
            isTop
              ? 'top-full border-t-navy'
              : 'bottom-full border-b-navy',
          ].join(' ')}
        />
      </span>
    </span>
  );
}
