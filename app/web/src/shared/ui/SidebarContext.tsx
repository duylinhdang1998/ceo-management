import { createContext, useContext } from 'react';

// ── SidebarContext ─────────────────────────────────────────────────────────
// Context + hook for mobile sidebar drawer state.
// Provider lives in SidebarProvider.tsx (separate component file).

export interface SidebarContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used inside SidebarProvider');
  return ctx;
}
