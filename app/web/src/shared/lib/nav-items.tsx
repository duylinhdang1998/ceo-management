import { LayoutDashboard, FileText, Users, Mail, Key } from 'lucide-react';
import type { SidebarNavItem } from '@/shared/ui/Sidebar';

// ── CEO / super_admin navigation (full admin menu) ─────────────────────────
// Single source of truth — import this in every super_admin page so the
// sidebar stays consistent across all screens.
export const CEO_NAV_ITEMS: SidebarNavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/reports', label: 'Quản lý báo cáo', icon: <FileText size={18} /> },
  { to: '/users', label: 'Quản lý nhân viên', icon: <Users size={18} /> },
  { to: '/email', label: 'Gửi email AI', icon: <Mail size={18} /> },
  { to: '/tokens', label: 'API Tokens', icon: <Key size={18} /> },
];

// ── Employee navigation (limited — MUST NOT expose admin items) ────────────
// US-A3: employees must NOT see "Quản lý nhân viên", "Gửi email AI", etc.
export const EMPLOYEE_NAV_ITEMS: SidebarNavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/reports', label: 'Báo cáo của tôi', icon: <FileText size={18} /> },
];
