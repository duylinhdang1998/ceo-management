import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';

// ── Verdana Health Sidebar ────────────────────────────────────────────────
// Navy background, white text, sage green active accent
// Width: 240px fixed | List rows: 48px height, 8px 16px padding, 1px divider

export interface SidebarNavItem {
  to: string;
  label: string;
  icon?: ReactNode;
  end?: boolean;
}

export interface SidebarProps {
  navItems: SidebarNavItem[];
  logo?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Sidebar({ navItems, logo, footer, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-[240px] shrink-0 flex-col bg-navy text-white',
        className,
      )}
    >
      {/* Logo area */}
      {logo && (
        <div className="flex h-[64px] items-center border-b border-white/10 px-lg">
          {logo}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-sm">
        <ul className="list-none m-0 p-0">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-[48px] items-center gap-sm px-[16px] py-[8px]',
                    'font-sans text-[16px] font-normal transition-colors duration-150',
                    'border-b border-white/5',
                    isActive
                      ? 'bg-white/10 text-white border-l-2 border-l-sage pl-[14px]'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                {item.icon && (
                  <span className="flex h-[20px] w-[20px] items-center justify-center shrink-0">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer slot */}
      {footer && (
        <div className="border-t border-white/10 p-md">{footer}</div>
      )}
    </aside>
  );
}
