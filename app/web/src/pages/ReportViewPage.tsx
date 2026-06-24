import { useParams, Navigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Key, Mail, LogOut } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
import type { SidebarNavItem } from '@/shared/ui/Sidebar';
import { useAuthStore, selectUser, selectRole } from '@/shared/stores/authStore';
import { Button } from '@/shared/ui/Button';
import { ReportViewer } from '@/features/reports';
import { NotePanel } from '@/features/notes';

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

// ── Logo ───────────────────────────────────────────────────────────────────
function PortalLogo() {
  return (
    <span className="font-heading text-[16px] font-semibold text-white tracking-tight">
      CEO Portal
    </span>
  );
}

// ── ReportViewPage ─────────────────────────────────────────────────────────
// Route: /reports/:id
// The API enforces assignment-based access control; the UI surfaces the 403
// as an error state inside ReportIframe. No client-side pre-auth needed.
export default function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore(selectUser);
  const role = useAuthStore(selectRole);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = role === 'super_admin';

  // Guard: missing id → redirect to reports list
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
      navItems={isAdmin ? CEO_NAV : EMPLOYEE_NAV}
      logo={<PortalLogo />}
      sidebarFooter={sidebarFooter}
      topbarTitle="Xem báo cáo"
    >
      {/* ReportViewer + NotePanel stacked vertically */}
      <div className="flex flex-col gap-xl pb-xl">
        <ReportViewer reportId={id} />
        {user && (
          <NotePanel
            reportId={id}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </PageLayout>
  );
}
