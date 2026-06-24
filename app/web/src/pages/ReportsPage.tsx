import { useState, useCallback } from 'react';
import { LayoutDashboard, FileText, Users, Key, Mail, LogOut } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
import type { SidebarNavItem } from '@/shared/ui/Sidebar';
import { Modal } from '@/shared/ui/Modal';
import { ToastContainer } from '@/shared/ui/Toast';
import type { ToastItem } from '@/shared/ui/Toast';
import { useAuthStore, selectUser, selectRole } from '@/shared/stores/authStore';
import { Button } from '@/shared/ui/Button';
import { PortalLogo } from '@/shared/ui/PortalLogo';
import {
  ReportList,
  ReportForm,
  ReportUpload,
  useCreateReport,
  useUpdateReport,
} from '@/features/reports';
import type { Report } from '@/features/reports';
import type { CreateReportPayload, UpdateReportPayload } from '@/features/reports';

// ── Nav items ──────────────────────────────────────────────────────────────
const CEO_NAV: SidebarNavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/reports', label: 'Quản lý báo cáo', icon: <FileText size={18} /> },
  { to: '/users', label: 'Quản lý nhân viên', icon: <Users size={18} /> },
  { to: '/tokens', label: 'API Tokens', icon: <Key size={18} /> },
  { to: '/email', label: 'Gửi email AI', icon: <Mail size={18} /> },
];

const EMPLOYEE_NAV: SidebarNavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/reports', label: 'Báo cáo của tôi', icon: <FileText size={18} /> },
];

// ── ReportsPage ────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const user = useAuthStore(selectUser);
  const role = useAuthStore(selectRole);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = role === 'super_admin';

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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  // Mutations
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();

  const handleCreate = (payload: CreateReportPayload | UpdateReportPayload) => {
    createReport.mutate(payload as CreateReportPayload, {
      onSuccess: () => {
        showToast('Báo cáo đã được tạo thành công', 'success');
        setIsUploadOpen(false);
      },
      onError: () => {
        showToast('Tạo báo cáo thất bại. Vui lòng thử lại.', 'error');
      },
    });
  };

  const handleUpdate = (payload: CreateReportPayload | UpdateReportPayload) => {
    updateReport.mutate(payload as UpdateReportPayload, {
      onSuccess: () => {
        showToast('Cập nhật thành công', 'success');
        setEditingReport(null);
      },
      onError: () => {
        showToast('Cập nhật thất bại. Vui lòng thử lại.', 'error');
      },
    });
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
        navItems={isAdmin ? CEO_NAV : EMPLOYEE_NAV}
        logo={<PortalLogo />}
        sidebarFooter={sidebarFooter}
        topbarTitle={isAdmin ? 'Quản lý báo cáo' : 'Báo cáo của tôi'}
      >
        <div className="mb-xl">
          <h1 className="font-heading text-h1 text-navy mb-sm">
            {isAdmin ? 'Quản lý báo cáo' : 'Báo cáo của tôi'}
          </h1>
          <p className="font-sans text-body text-helper-text">
            {isAdmin
              ? 'Tạo, chỉnh sửa và quản lý các báo cáo HTML.'
              : 'Danh sách báo cáo được gán cho bạn.'}
          </p>
        </div>

        <ReportList
          isAdmin={isAdmin}
          onEditReport={(report) => setEditingReport(report)}
          onCreateReport={() => setIsUploadOpen(true)}
          onShowToast={showToast}
        />
      </PageLayout>

      {/* Create modal (upload) */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Tạo báo cáo mới"
        size="md"
      >
        <ReportUpload
          onSubmit={handleCreate}
          onCancel={() => setIsUploadOpen(false)}
          isSubmitting={createReport.isPending}
        />
      </Modal>

      {/* Edit modal (metadata only) */}
      <Modal
        isOpen={Boolean(editingReport)}
        onClose={() => setEditingReport(null)}
        title="Chỉnh sửa báo cáo"
        size="md"
      >
        <ReportForm
          report={editingReport ?? undefined}
          onSubmit={handleUpdate}
          onCancel={() => setEditingReport(null)}
          isSubmitting={updateReport.isPending}
        />
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
