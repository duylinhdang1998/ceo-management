import { lazy, Suspense } from 'react';
import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated, selectMustChangePassword, selectRole } from '@/shared/stores/authStore';
import type { Role } from '@/shared/types';

// ── Lazy page imports ─────────────────────────────────────────────────────
// TODO(1.4 FE#2): replace placeholder file content for LoginPage, ChangePasswordPage, DashboardPage

const LoginPage = lazy(() => import('./LoginPage'));
const ChangePasswordPage = lazy(() => import('./ChangePasswordPage'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const ReportsPage = lazy(() => import('./ReportsPage'));
const ReportViewPage = lazy(() => import('./ReportViewPage'));
// AssignReportPage — owned by FE#2 (Task 2.4). Route declared here so
// the "Gán nhân viên" button in ReportList can navigate to /reports/:id/assign.
// FE#2 creates: app/web/src/pages/AssignReportPage.tsx
const AssignReportPage = lazy(() => import('./AssignReportPage'));
const UsersPage = lazy(() => import('./UsersPage'));
const TokensPage = lazy(() => import('./TokensPage'));
// EmailPage — owned by FE#2 (Task 3.4). Route declared here so the
// "Gửi email AI" sidebar item navigates to /email.
// FE#2 creates: app/web/src/pages/EmailPage.tsx
const EmailPage = lazy(() => import('./EmailPage'));

// ── Loading fallback ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-navy border-t-transparent" />
    </div>
  );
}

// ── Auth Guard: redirects to /login if not authenticated ──────────────────
function AuthGuard() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const mustChangePassword = useAuthStore(selectMustChangePassword);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // "Must change password" guard: force redirect to /change-password
  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}

// ── Role Guard: only allows specified roles ───────────────────────────────
function RoleGuard({ allowedRoles }: { allowedRoles: Role[] }) {
  const role = useAuthStore(selectRole);

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to dashboard — access denied
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// ── Guest Guard: redirect authenticated users away from /login ────────────
function GuestGuard() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const mustChangePassword = useAuthStore(selectMustChangePassword);

  if (isAuthenticated && !mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated && mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}

// ── Change Password Guard ─────────────────────────────────────────────────
function ChangePasswordGuard() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const mustChangePassword = useAuthStore(selectMustChangePassword);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// ── Suspense wrapper ──────────────────────────────────────────────────────
function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── Route definitions ─────────────────────────────────────────────────────
// Page file paths declared here (FE#2 fills real content):
//   app/web/src/pages/LoginPage.tsx          — FE#2 Task 1.4
//   app/web/src/pages/ChangePasswordPage.tsx — FE#2 Task 1.4
//   app/web/src/pages/DashboardPage.tsx      — FE#2 Task 1.4
//   app/web/src/pages/ReportsPage.tsx        — FE#1 Sprint 2
//   app/web/src/pages/ReportViewPage.tsx     — FE#1 Sprint 2
//   app/web/src/pages/UsersPage.tsx          — FE#2
//   app/web/src/pages/TokensPage.tsx         — FE#1 Sprint 2

export const routes: RouteObject[] = [
  // ── Public routes (unauthenticated only) ──────────────────────────────
  {
    element: <GuestGuard />,
    children: [
      {
        path: '/login',
        element: (
          <SuspensePage>
            <LoginPage />
          </SuspensePage>
        ),
      },
    ],
  },

  // ── Change-password route (must be authenticated, mustChangePassword=true) ──
  {
    element: <ChangePasswordGuard />,
    children: [
      {
        path: '/change-password',
        element: (
          <SuspensePage>
            <ChangePasswordPage />
          </SuspensePage>
        ),
      },
    ],
  },

  // ── Protected routes (authenticated + password changed) ───────────────
  {
    element: <AuthGuard />,
    children: [
      // Dashboard — accessible to all authenticated roles
      {
        path: '/',
        element: (
          <SuspensePage>
            <DashboardPage />
          </SuspensePage>
        ),
      },

      // Reports — accessible to all authenticated roles
      {
        path: '/reports',
        element: (
          <SuspensePage>
            <ReportsPage />
          </SuspensePage>
        ),
      },

      // Report viewer — accessible to all authenticated roles (API enforces assignment)
      {
        path: '/reports/:id',
        element: (
          <SuspensePage>
            <ReportViewPage />
          </SuspensePage>
        ),
      },

      // Super-admin only routes
      {
        element: <RoleGuard allowedRoles={['super_admin']} />,
        children: [
          // Assign report to employees — FE#2 implements AssignReportPage.tsx
          {
            path: '/reports/:id/assign',
            element: (
              <SuspensePage>
                <AssignReportPage />
              </SuspensePage>
            ),
          },
          {
            path: '/users',
            element: (
              <SuspensePage>
                <UsersPage />
              </SuspensePage>
            ),
          },
          {
            path: '/tokens',
            element: (
              <SuspensePage>
                <TokensPage />
              </SuspensePage>
            ),
          },
          // Email AI — FE#2 implements EmailPage.tsx
          {
            path: '/email',
            element: (
              <SuspensePage>
                <EmailPage />
              </SuspensePage>
            ),
          },
        ],
      },
    ],
  },

  // ── Catch-all: redirect to home ───────────────────────────────────────
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];
