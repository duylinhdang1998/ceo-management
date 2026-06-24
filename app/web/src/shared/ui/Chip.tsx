import { type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Chip ───────────────────────────────────────────────────
// Variants: filter | filter-active | success | warning | error
// Padding: 4px 12px | Radius: 4px (sm)
// Font: 12px/500, uppercase, tracking 0.5px

export type ChipVariant =
  | 'filter'
  | 'filter-active'
  | 'success'
  | 'warning'
  | 'error';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

const variantClasses: Record<ChipVariant, string> = {
  // Filter: #F8FAFC fill, #0F172A text, 1px #E2E8F0 border
  filter: 'bg-bg text-navy border border-nav-border',

  // Filter Active: #0F172A fill, white text, no border
  'filter-active': 'bg-navy text-white border-transparent',

  // Status Success: #22C55E15 fill, #16A34A text, no border
  success: 'bg-success-muted text-success-text border-transparent',

  // Status Warning: #EAB30815 fill, #CA8A04 text, no border
  warning: 'bg-warning-muted text-warning-text border-transparent',

  // Status Error: #EF444415 fill, #DC2626 text, no border
  error: 'bg-error-muted text-error-text border-transparent',
};

export function Chip({ variant = 'filter', className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-[12px] py-[4px]',
        'font-sans text-[12px] font-medium uppercase',
        'leading-[1.4] tracking-chip',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
