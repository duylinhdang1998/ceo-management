import { useState, useCallback, type ReactNode } from 'react';
import { SidebarContext } from './SidebarContext';

// ── SidebarProvider ────────────────────────────────────────────────────────
// Provides open/close state for the mobile sidebar drawer to all children.
// Keep this file as a single-component export so react-refresh works correctly.

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  return (
    <SidebarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}
