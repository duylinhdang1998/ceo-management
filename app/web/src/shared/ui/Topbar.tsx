import { Menu } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useSidebar } from './SidebarContext';

// ── Verdana Health Topbar ─────────────────────────────────────────────────
// White background, 1px #E2E8F0 border-bottom, 64px height
// Left: hamburger (mobile only) + page title | Right: actions slot

export interface TopbarProps {
  title?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}

export function Topbar({ title, actions, breadcrumb, className }: TopbarProps) {
  const { toggle } = useSidebar();

  return (
    <header
      className={cn(
        'flex h-[64px] items-center justify-between border-b border-nav-border bg-surface px-md md:px-xl',
        className,
      )}
    >
      {/* Left: hamburger (mobile/tablet only) + breadcrumb + title */}
      <div className="flex items-center gap-sm min-w-0">
        {/* Hamburger — only visible below lg */}
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-navy hover:bg-ghost-hover transition-colors lg:hidden"
          onClick={toggle}
          aria-label="Mở menu điều hướng"
        >
          <Menu size={20} />
        </button>

        <div className="flex flex-col justify-center min-w-0">
          {breadcrumb && (
            <div className="mb-[2px] font-sans text-[12px] text-helper-text">
              {breadcrumb}
            </div>
          )}
          {title && (
            <h1 className="font-heading text-[16px] md:text-h3 font-semibold text-navy leading-none truncate">
              {title}
            </h1>
          )}
        </div>
      </div>

      {/* Right: action buttons / user avatar */}
      {actions && (
        <div className="flex items-center gap-sm shrink-0">{actions}</div>
      )}
    </header>
  );
}
