import { useAuthStore, selectRole } from '@/shared/stores/authStore';
import { CeoDashboard, EmployeeDashboard } from '@/features/dashboard';

// ── DashboardPage ─────────────────────────────────────────────────────────
// Route: / (wrapped in AuthGuard — redirects to /login if not authenticated,
//           redirects to /change-password if mustChangePassword=true)
// Renders CeoDashboard (super_admin) or EmployeeDashboard (employee) by role.
export default function DashboardPage() {
  const role = useAuthStore(selectRole);

  if (role === 'super_admin') {
    return <CeoDashboard />;
  }

  return <EmployeeDashboard />;
}
