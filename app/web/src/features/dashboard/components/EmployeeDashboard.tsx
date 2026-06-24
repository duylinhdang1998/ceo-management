import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, LogOut, Eye } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
import type { SidebarNavItem } from '@/shared/ui/Sidebar';
import { useAuthStore, selectUser } from '@/shared/stores/authStore';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { PortalLogo } from '@/shared/ui/PortalLogo';
import { useReports } from '@/features/reports';
import type { Report } from '@/features/reports';

// ── Employee sidebar navigation (limited — no admin items) ────────────────
// US-A3: employee sidebar MUST NOT have:
//   - "Quản lý nhân viên", admin CRUD, "Gửi email AI"
const EMPLOYEE_NAV_ITEMS: SidebarNavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    end: true,
  },
  {
    to: '/reports',
    label: 'Báo cáo của tôi',
    icon: <FileText size={18} />,
  },
];

// ── AssignedReportRow ──────────────────────────────────────────────────────
function AssignedReportRow({ report }: { report: Report }) {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center justify-between gap-md py-sm border-b border-[#F1F5F9] last:border-0 cursor-pointer hover:bg-list-hover rounded px-sm transition-colors"
      onClick={() => navigate(`/reports/${report.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[14px] font-medium text-navy truncate">{report.title}</p>
        {report.description && (
          <p className="font-sans text-[12px] text-helper-text truncate mt-[2px]">
            {report.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-sm shrink-0">
        <Chip variant="success">Xuất bản</Chip>
        <button
          aria-label="Xem báo cáo"
          className="text-helper-text hover:text-navy transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/reports/${report.id}`);
          }}
        >
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
}

// ── EmployeeDashboard ─────────────────────────────────────────────────────
export function EmployeeDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);
  const logout = useAuthStore((s) => s.logout);

  // Fetch assigned + published reports for this employee (API filters by JWT)
  const { data, isLoading } = useReports({ limit: 10 });
  const reports = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const sidebarFooter = (
    <div className="flex flex-col gap-xs">
      <p className="font-sans text-caption text-white/60 truncate">
        {user?.email ?? ''}
      </p>
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
      navItems={EMPLOYEE_NAV_ITEMS}
      logo={<PortalLogo />}
      sidebarFooter={sidebarFooter}
      topbarTitle="Dashboard nhân viên"
    >
      {/* Welcome banner */}
      <div className="mb-xl">
        <h1
          className="font-heading text-h1 text-navy mb-sm"
          data-testid="dashboard-title"
        >
          Dashboard nhân viên
        </h1>
        <p className="font-sans text-body text-helper-text">
          Xin chào, {user?.name || user?.email || 'Nhân viên'}. Chào mừng đến CEO Management Portal.
        </p>
      </div>

      {/* Assigned reports list */}
      <div className="rounded border border-nav-border bg-surface shadow-sm">
        <div className="flex items-center justify-between px-lg py-md border-b border-nav-border">
          <h2 className="font-heading text-h3 text-navy">Báo cáo được gán</h2>
          {total > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reports')}
            >
              Xem tất cả ({total})
            </Button>
          )}
        </div>

        <div className="px-lg py-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-xl">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
            </div>
          ) : reports.length === 0 ? (
            <p className="font-sans text-body text-helper-text py-lg text-center">
              Chưa có báo cáo nào được gán cho bạn.
            </p>
          ) : (
            reports.map((report) => (
              <AssignedReportRow key={report.id} report={report} />
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
