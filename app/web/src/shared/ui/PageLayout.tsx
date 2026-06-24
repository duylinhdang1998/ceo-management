import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Sidebar, type SidebarNavItem } from './Sidebar';
import { Topbar } from './Topbar';

// ── Verdana Health PageLayout ─────────────────────────────────────────────
// Full-height layout: fixed Sidebar (240px) + flexible main column
// Main column: Topbar (64px) + scrollable content area with bg (#F8FAFC)

export interface PageLayoutProps {
  navItems: SidebarNavItem[];
  logo?: ReactNode;
  sidebarFooter?: ReactNode;
  topbarTitle?: string;
  topbarActions?: ReactNode;
  topbarBreadcrumb?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  navItems,
  logo,
  sidebarFooter,
  topbarTitle,
  topbarActions,
  topbarBreadcrumb,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn('flex h-screen overflow-hidden bg-bg', className)}>
      {/* Sidebar */}
      <Sidebar
        navItems={navItems}
        logo={logo}
        footer={sidebarFooter}
      />

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar
          title={topbarTitle}
          actions={topbarActions}
          breadcrumb={topbarBreadcrumb}
        />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-xl">
          {children}
        </main>
      </div>
    </div>
  );
}
