import { useState, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
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
import type { CreateReportPayload, UpdateReportPayload } from '@/features/reports/hooks/useReportMutations';
import { CEO_NAV_ITEMS, EMPLOYEE_NAV_ITEMS } from '@/shared/lib/nav-items';

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

  const handleCreate = (payload: CreateReportPayload) => {
    createReport.mutate(payload, {
      onSuccess: () => {
        showToast('Báo cáo đã được tạo thành công', 'success');
        setIsUploadOpen(false);
      },
      onError: () => {
        showToast('Tạo báo cáo thất bại. Vui lòng thử lại.', 'error');
      },
    });
  };

  const handleUpdate = (payload: UpdateReportPayload) => {
    updateReport.mutate(payload, {
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
        navItems={isAdmin ? CEO_NAV_ITEMS : EMPLOYEE_NAV_ITEMS}
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
          onSubmit={(p) => handleCreate(p)}
          onCancel={() => setIsUploadOpen(false)}
          isSubmitting={createReport.isPending}
        />
      </Modal>

      {/* Edit modal (metadata + optional file replacement) */}
      <Modal
        isOpen={Boolean(editingReport)}
        onClose={() => setEditingReport(null)}
        title="Chỉnh sửa báo cáo"
        size="md"
      >
        {editingReport && (
          <ReportForm
            report={editingReport}
            onSubmit={handleUpdate}
            onCancel={() => setEditingReport(null)}
            isSubmitting={updateReport.isPending}
          />
        )}
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
