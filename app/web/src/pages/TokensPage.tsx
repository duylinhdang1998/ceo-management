import { useState, useCallback } from 'react';
import { LayoutDashboard, FileText, Users, Key, Mail, LogOut } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
import type { SidebarNavItem } from '@/shared/ui/Sidebar';
import { ToastContainer } from '@/shared/ui/Toast';
import type { ToastItem } from '@/shared/ui/Toast';
import { Button } from '@/shared/ui/Button';
import { PortalLogo } from '@/shared/ui/PortalLogo';
import { useAuthStore } from '@/shared/stores/authStore';
import {
  useTokens,
  useCreateToken,
  useRevokeToken,
  TokenList,
  CreateTokenForm,
  TokenRevealModal,
} from '@/features/tokens';

// ── Nav items ──────────────────────────────────────────────────────────────

const CEO_NAV: SidebarNavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/reports', label: 'Quản lý báo cáo', icon: <FileText size={18} /> },
  { to: '/users', label: 'Quản lý nhân viên', icon: <Users size={18} /> },
  { to: '/tokens', label: 'API Tokens', icon: <Key size={18} /> },
  { to: '/email', label: 'Gửi email AI', icon: <Mail size={18} /> },
];

// ── TokensPage ─────────────────────────────────────────────────────────────

export default function TokensPage() {
  const logout = useAuthStore((s) => s.logout);

  // Toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title: msg }]);
  }, []);

  // Reveal modal state (holds the one-time plaintext token)
  const [revealToken, setRevealToken] = useState<{
    name: string;
    value: string;
  } | null>(null);

  // Data + mutations
  const { data, isLoading } = useTokens();
  const createToken = useCreateToken();
  const revokeToken = useRevokeToken();

  const tokens = data?.data ?? [];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = useCallback(
    (name: string) => {
      createToken.mutate(
        { name },
        {
          onSuccess: (res) => {
            setRevealToken({ name: res.data.name, value: res.data.token });
          },
          onError: (err) => {
            showToast(err.message ?? 'Tạo token thất bại', 'error');
          },
        },
      );
    },
    [createToken, showToast],
  );

  const handleRevoke = useCallback(
    (id: string) => {
      revokeToken.mutate(id, {
        onSuccess: () => {
          showToast('Token đã được thu hồi thành công', 'success');
        },
        onError: (err) => {
          showToast(err.message ?? 'Thu hồi token thất bại', 'error');
        },
      });
    },
    [revokeToken, showToast],
  );

  const handleCloseReveal = useCallback(() => {
    setRevealToken(null);
  }, []);

  // ── Sidebar footer ────────────────────────────────────────────────────────

  const sidebarFooter = (
    <Button variant="ghost" size="sm" className="w-full justify-start gap-sm" onClick={logout}>
      <LogOut size={16} />
      Đăng xuất
    </Button>
  );

  return (
    <PageLayout
      navItems={CEO_NAV}
      logo={<PortalLogo />}
      sidebarFooter={sidebarFooter}
      topbarTitle="API Tokens"
    >
      <div className="mx-auto max-w-4xl space-y-xl">
        {/* Page header */}
        <div>
          <h1 className="font-heading text-h2 font-semibold text-navy">
            Personal Access Tokens
          </h1>
          <p className="mt-xs font-sans text-[14px] leading-[1.6] text-helper-text">
            Tạo token để cấp quyền cho Claude Skill hoặc các tích hợp bên ngoài gọi API
            báo cáo. Token chỉ được hiển thị một lần khi tạo.
          </p>
        </div>

        {/* Create form card */}
        <div className="rounded border border-nav-border bg-surface p-lg shadow-sm">
          <h2 className="mb-md font-heading text-[16px] font-medium text-navy">
            Tạo token mới
          </h2>
          <CreateTokenForm
            isLoading={createToken.isPending}
            onSubmit={handleCreate}
          />
        </div>

        {/* Token list */}
        <div>
          <h2 className="mb-md font-heading text-[16px] font-medium text-navy">
            Danh sách token ({tokens.length})
          </h2>
          <TokenList
            tokens={tokens}
            isLoading={isLoading}
            isRevoking={revokeToken.isPending}
            onRevoke={handleRevoke}
          />
        </div>
      </div>

      {/* One-time token reveal modal */}
      {revealToken && (
        <TokenRevealModal
          isOpen
          tokenName={revealToken.name}
          tokenValue={revealToken.value}
          onClose={handleCloseReveal}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </PageLayout>
  );
}
