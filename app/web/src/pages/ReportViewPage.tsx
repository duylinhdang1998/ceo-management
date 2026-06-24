import { useParams, Navigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { PageLayout } from '@/shared/ui/PageLayout';
import { useAuthStore, selectUser, selectRole } from '@/shared/stores/authStore';
import { Button } from '@/shared/ui/Button';
import { PortalLogo } from '@/shared/ui/PortalLogo';
import { ReportViewer } from '@/features/reports';
import { CEO_NAV_ITEMS, EMPLOYEE_NAV_ITEMS } from '@/shared/lib/nav-items';

// ── ReportViewPage ─────────────────────────────────────────────────────────
// Route: /reports/:id
// The API enforces assignment-based access control; the UI surfaces the 403
// as an error state inside ReportIframe. No client-side pre-auth needed.
// Notes are now shown inside a right-side Drawer opened from ReportViewer.
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
      navItems={isAdmin ? CEO_NAV_ITEMS : EMPLOYEE_NAV_ITEMS}
      logo={<PortalLogo />}
      sidebarFooter={sidebarFooter}
      topbarTitle="Xem báo cáo"
    >
      {/* ReportViewer now owns the notes drawer — no inline NotePanel */}
      <ReportViewer
        reportId={id}
        currentUserId={user?.id}
        isAdmin={isAdmin}
      />
    </PageLayout>
  );
}
