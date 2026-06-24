/* eslint-disable react-refresh/only-export-components -- routing module exports route config alongside small inline guard components by design */
import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated, selectMustChangePassword, selectRole } from '@/shared/stores/authStore';
import type { Role } from '@/shared/types';

// ── Static page imports ───────────────────────────────────────────────────
import LoginPage from './LoginPage';
import ChangePasswordPage from './ChangePasswordPage';
import DashboardPage from './DashboardPage';
import ReportsPage from './ReportsPage';
import ReportViewPage from './ReportViewPage';
import UsersPage from './UsersPage';
import TokensPage from './TokensPage';
import EmailPage from './EmailPage';

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

// ── Route definitions ─────────────────────────────────────────────────────
export const routes: RouteObject[] = [
  // ── Public routes (unauthenticated only) ──────────────────────────────
  {
    element: <GuestGuard />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },

  // ── Change-password route (must be authenticated, mustChangePassword=true) ──
  {
    element: <ChangePasswordGuard />,
    children: [
      {
        path: '/change-password',
        element: <ChangePasswordPage />,
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
        element: <DashboardPage />,
      },

      // Reports — accessible to all authenticated roles
      {
        path: '/reports',
        element: <ReportsPage />,
      },

      // Report viewer — accessible to all authenticated roles (API enforces assignment)
      {
        path: '/reports/:id',
        element: <ReportViewPage />,
      },

      // Super-admin only routes
      {
        element: <RoleGuard allowedRoles={['super_admin']} />,
        children: [
          {
            path: '/users',
            element: <UsersPage />,
          },
          {
            path: '/tokens',
            element: <TokensPage />,
          },
          // Email AI
          {
            path: '/email',
            element: <EmailPage />,
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
