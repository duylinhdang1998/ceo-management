import { useEffect, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useSidebar } from './SidebarContext';
import { SidebarProvider } from './SidebarProvider';
import { Sidebar, type SidebarNavItem } from './Sidebar';
import { Topbar } from './Topbar';

// ── Verdana Health PageLayout ─────────────────────────────────────────────
// Full-height layout: fixed Sidebar (240px on lg+) + flexible main column
// Mobile/tablet (<lg): sidebar becomes an off-canvas overlay drawer.

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

// ── Inner layout (consumes SidebarContext) ────────────────────────────────
function PageLayoutInner({
  navItems,
  logo,
  sidebarFooter,
  topbarTitle,
  topbarActions,
  topbarBreadcrumb,
  children,
  className,
}: PageLayoutProps) {
  const { isOpen, close } = useSidebar();

  // Lock body scroll when the mobile sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className={cn('flex h-screen overflow-hidden bg-bg', className)}>
      {/* ── Desktop sidebar (lg+) ── */}
      <div className="hidden lg:flex">
        <Sidebar navItems={navItems} logo={logo} footer={sidebarFooter} />
      </div>

      {/* ── Mobile/tablet: off-canvas drawer (<lg) ── */}
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-navy/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
        onClick={close}
      />
      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-[240px] transition-transform duration-200 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
      >
        <Sidebar
          navItems={navItems}
          logo={logo}
          footer={sidebarFooter}
          onNavClick={close}
        />
      </div>

      {/* ── Main column ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <Topbar
          title={topbarTitle}
          actions={topbarActions}
          breadcrumb={topbarBreadcrumb}
        />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-md md:p-xl">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Public export (wraps with provider) ──────────────────────────────────
export function PageLayout(props: PageLayoutProps) {
  return (
    <SidebarProvider>
      <PageLayoutInner {...props} />
    </SidebarProvider>
  );
}
