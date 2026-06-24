import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
import { Button } from '@/shared/ui/Button';
import { useAuthStore, selectUser } from '@/shared/stores/authStore';
import { PortalLogo } from '@/shared/ui/PortalLogo';
import { AssignmentPanel } from '@/features/assignments/components/AssignmentPanel';
import { useReportDetail } from '@/features/assignments/hooks/useAssignments';
import { CEO_NAV_ITEMS } from '@/shared/lib/nav-items';

// ── AssignReportPage ──────────────────────────────────────────────────────
// Route: /reports/:id/assign (super_admin only — FE#1 will add the route to routes.tsx)
// Reads :id from route params, loads report title, shows AssignmentPanel.
// Back button navigates to /reports.

export default function AssignReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);
  const logout = useAuthStore((s) => s.logout);

  const { data: report, isLoading, isError } = useReportDetail(id ?? '');

  // Guard: missing id → back to reports
  if (!id) {
    return <Navigate to="/reports" replace />;
  }

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
    <PageLayout
      navItems={CEO_NAV_ITEMS}
      logo={<PortalLogo />}
      sidebarFooter={sidebarFooter}
      topbarTitle="Gán nhân viên"
    >
      <div className="flex flex-col gap-lg">
        {/* Back button */}
        <div className="flex items-center gap-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            className="gap-[6px]"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách báo cáo
          </Button>
        </div>

        {/* Report title */}
        {isLoading ? (
          <div className="flex items-center gap-sm">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-navy border-t-transparent" />
            <span className="font-sans text-[14px] text-helper-text">
              Đang tải báo cáo...
            </span>
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="rounded border border-error-muted bg-error-muted px-md py-sm font-sans text-[14px] text-error-text"
          >
            Không thể tải thông tin báo cáo. Vui lòng thử lại.
          </div>
        ) : (
          <div>
            <h1 className="font-heading text-h1 text-navy mb-xs">
              {report?.title ?? 'Báo cáo'}
            </h1>
            <p className="font-sans text-[14px] text-helper-text">
              Gán hoặc bỏ gán nhân viên cho báo cáo này.
            </p>
          </div>
        )}

        {/* Assignment panel — shows current assignees + picker */}
        {!isLoading && (
          <div className="max-w-[640px]">
            <AssignmentPanel reportId={id} reportDetail={report} />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
