import { useState, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
import { ToastContainer } from '@/shared/ui/Toast';
import type { ToastItem } from '@/shared/ui/Toast';
import { useAuthStore, selectUser } from '@/shared/stores/authStore';
import { PortalLogo } from '@/shared/ui/PortalLogo';
import { AiEmailComposer } from '@/features/email';
import { CEO_NAV_ITEMS } from '@/shared/lib/nav-items';

// ── EmailPage ──────────────────────────────────────────────────────────────
// Route: /email — super_admin only (RoleGuard in routes.tsx enforces this).
// Renders the full AI email composer inside the standard PageLayout.

export default function EmailPage() {
  const user = useAuthStore(selectUser);
  const logout = useAuthStore((s) => s.logout);

  // Toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, type: 'success' | 'error', description?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
    },
    [],
  );

  // Sidebar footer: user info + logout
  const sidebarFooter = (
    <div className="flex flex-col gap-sm">
      {user && (
        <div className="px-sm">
          <p className="truncate font-sans text-[13px] font-medium text-navy">{user.name}</p>
          <p className="truncate font-sans text-[11px] text-helper-text">{user.email}</p>
        </div>
      )}
      <button
        onClick={logout}
        className="flex items-center gap-sm rounded px-sm py-[6px] font-sans text-[13px] text-helper-text transition-colors hover:bg-bg hover:text-navy"
      >
        <LogOut size={15} />
        Đăng xuất
      </button>
    </div>
  );

  return (
    <>
      <PageLayout
        navItems={CEO_NAV_ITEMS}
        logo={<PortalLogo />}
        sidebarFooter={sidebarFooter}
        topbarTitle="Gửi email AI"
      >
        {/* ── Composer card ──────────────────────────────────────────────── */}
        <div className="mx-auto max-w-2xl">
          <div className="rounded border border-nav-border bg-surface p-lg shadow-sm">
            <h1 className="mb-lg font-heading text-h2 font-semibold text-navy">
              Soạn email bằng AI
            </h1>
            <p className="mb-lg font-sans text-[14px] text-helper-text">
              Mô tả yêu cầu bằng ngôn ngữ tự nhiên — AI sẽ tự động điền người nhận, tiêu đề và
              nội dung email.
            </p>

            <AiEmailComposer
              onSendSuccess={() =>
                showToast('Gửi email thành công', 'success', 'Email đã được gửi tới người nhận.')
              }
              onSendError={(msg) => showToast('Gửi email thất bại', 'error', msg)}
            />
          </div>
        </div>
      </PageLayout>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
