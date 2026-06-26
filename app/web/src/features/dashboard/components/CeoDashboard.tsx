import { FileText, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/shared/ui/PageLayout';
import { useAuthStore, selectUser } from '@/shared/stores/authStore';
import { Button } from '@/shared/ui/Button';
import { PortalLogo } from '@/shared/ui/PortalLogo';
import { StatCard } from './StatCard';
import { useReports } from '@/features/reports';
import { useUsers } from '@/shared/hooks/useUsers';
import { CEO_NAV_ITEMS } from '@/shared/lib/nav-items';

// ── CeoDashboard ──────────────────────────────────────────────────────────
export function CeoDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);
  const logout = useAuthStore((s) => s.logout);

  // Real data: total reports count (backend filters by role automatically)
  const { data: reportsData, isLoading: reportsLoading } = useReports({ limit: 1 });
  const totalReports = reportsData?.meta?.total;

  // Real data: total employee count
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 1 });
  const totalUsers = usersData?.meta?.total;

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
      navItems={CEO_NAV_ITEMS}
      logo={<PortalLogo />}
      sidebarFooter={sidebarFooter}
      topbarTitle="Quản trị CEO"
    >
      {/* Welcome banner */}
      <div className="mb-md md:mb-xl">
        <h1
          className="font-heading text-h2 md:text-h1 text-navy mb-sm"
          data-testid="dashboard-title"
        >
          Quản trị CEO
        </h1>
        <p className="font-sans text-body text-helper-text">
          Xin chào, {user?.name || user?.email || 'CEO'}. Chào mừng đến CEO Management Portal.
        </p>
      </div>

      {/* Stat cards with real data */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Tổng báo cáo"
          value={reportsLoading ? '...' : String(totalReports ?? 0)}
          description="Tất cả báo cáo trong hệ thống"
        />
        <StatCard
          label="Nhân viên"
          value={usersLoading ? '...' : String(totalUsers ?? 0)}
          description="Quản lý danh sách nhân viên"
        />
        <StatCard
          label="Email AI"
          value="—"
          description="Soạn & gửi email thông minh"
        />
      </div>

      {/* Quick links */}
      <div className="mt-xl">
        <h2 className="font-heading text-h3 text-navy mb-md">Thao tác nhanh</h2>
        <div className="flex flex-wrap gap-sm">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/reports')}
          >
            <FileText size={14} />
            Xem tất cả báo cáo
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/users')}
          >
            <Users size={14} />
            Quản lý nhân viên
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
