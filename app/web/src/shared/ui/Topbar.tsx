import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Topbar ─────────────────────────────────────────────────
// White background, 1px #E2E8F0 border-bottom, 64px height
// Left: page title | Right: actions slot

export interface TopbarProps {
  title?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}

export function Topbar({ title, actions, breadcrumb, className }: TopbarProps) {
  return (
    <header
      className={cn(
        'flex h-[64px] items-center justify-between border-b border-nav-border bg-surface px-xl',
        className,
      )}
    >
      {/* Left: breadcrumb + title */}
      <div className="flex flex-col justify-center min-w-0">
        {breadcrumb && (
          <div className="mb-[2px] font-sans text-[12px] text-helper-text">
            {breadcrumb}
          </div>
        )}
        {title && (
          <h1 className="font-heading text-h3 font-semibold text-navy leading-none truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right: action buttons / user avatar */}
      {actions && (
        <div className="flex items-center gap-sm shrink-0">{actions}</div>
      )}
    </header>
  );
}
