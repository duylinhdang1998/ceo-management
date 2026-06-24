import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types';

// ── Auth State ────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  user: Pick<User, 'id' | 'role' | 'mustChangePassword' | 'name' | 'email'> | null;

  // Actions
  login: (
    token: string,
    user: Pick<User, 'id' | 'role' | 'mustChangePassword' | 'name' | 'email'>,
  ) => void;
  logout: () => void;
  setMustChangePassword: (value: boolean) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),

      setMustChangePassword: (value) =>
        set((state) => ({
          user: state.user ? { ...state.user, mustChangePassword: value } : null,
        })),
    }),
    {
      name: 'auth-store', // localStorage key — matches api-client.ts lookup
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);

// ── Selectors (stable references) ─────────────────────────────────────────

export const selectToken = (s: AuthState) => s.token;
export const selectUser = (s: AuthState) => s.user;
export const selectRole = (s: AuthState) => s.user?.role ?? null;
export const selectIsAuthenticated = (s: AuthState) => s.token !== null;
export const selectMustChangePassword = (s: AuthState) =>
  s.user?.mustChangePassword ?? false;
