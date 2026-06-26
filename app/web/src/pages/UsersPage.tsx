import { useState, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
import { Button } from '@/shared/ui/Button';
import { ToastContainer } from '@/shared/ui/Toast';
import type { ToastItem } from '@/shared/ui/Toast';
import { useAuthStore, selectUser } from '@/shared/stores/authStore';
import type { User } from '@/shared/types';
import { PortalLogo } from '@/shared/ui/PortalLogo';
import { UserList } from '@/features/users/components/UserList';
import { UserForm } from '@/features/users/components/UserForm';
import { ConfirmResetModal } from '@/features/users/components/ConfirmResetModal';
import { CEO_NAV_ITEMS } from '@/shared/lib/nav-items';

// ── UsersPage ─────────────────────────────────────────────────────────────
// Route: /users (super_admin only — enforced by RoleGuard in routes.tsx)
// Composes: UserList + UserForm (create/edit modal) + ResetPasswordModal

export default function UsersPage() {
  const user = useAuthStore(selectUser);
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

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [resetUser, setResetUser] = useState<User | null>(null);

  const handleAdd = () => {
    setEditingUser(undefined);
    setFormOpen(true);
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingUser(undefined);
    showToast(
      editingUser ? 'Cập nhật nhân viên thành công' : 'Tạo nhân viên thành công',
      'success',
    );
  };

  const handleResetPassword = (u: User) => {
    setResetUser(u);
  };

  const handleResetClose = () => {
    const userName = resetUser?.name;
    setResetUser(null);
    if (userName) {
      showToast(`Đã đặt lại mật khẩu của ${userName} về Nhanvien@123`, 'success');
    }
  };

  const sidebarFooter = (
    <div className="flex flex-col gap-xs">
      <p className="font-sans text-caption text-white/60 truncate">{user?.email ?? ''}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 px-0"
      >
        <LogOut size={14} />
        Đăng xuất
      </Button>
    </div>
  );

  return (
    <>
      <PageLayout
        navItems={CEO_NAV_ITEMS}
        logo={<PortalLogo />}
        sidebarFooter={sidebarFooter}
        topbarTitle="Quản lý nhân viên"
      >
        <div className="mb-md md:mb-xl">
          <h1 className="font-heading text-h2 md:text-h1 text-navy mb-sm">Quản lý nhân viên</h1>
          <p className="font-sans text-body text-helper-text">
            Tạo, sửa, khóa tài khoản nhân viên và cấp lại mật khẩu.
          </p>
        </div>

        <UserList
          onAdd={handleAdd}
          onEdit={handleEdit}
          onResetPassword={handleResetPassword}
        />
      </PageLayout>

      {/* Create / Edit modal */}
      <UserForm
        isOpen={formOpen}
        onClose={handleFormClose}
        user={editingUser}
      />

      {/* Reset password confirm modal */}
      <ConfirmResetModal
        isOpen={resetUser !== null}
        onClose={handleResetClose}
        user={resetUser}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
