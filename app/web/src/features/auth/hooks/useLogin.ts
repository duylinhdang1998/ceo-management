import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import { useAuthStore } from '@/shared/stores/authStore';
import type { ApiResponse } from '@/shared/types';

// ── Login API contract ────────────────────────────────────────────────────
interface LoginPayload {
  email: string;
  password: string;
}

interface LoginData {
  accessToken: string;
  role: string;
  mustChangePassword: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'employee';
    mustChangePassword: boolean;
  };
}

type LoginResponse = ApiResponse<LoginData>;

// ── useLogin hook ─────────────────────────────────────────────────────────
export function useLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  return useMutation<LoginResponse, AxiosError<{ error?: { message?: string }; message?: string }>, LoginPayload>({
    mutationFn: (payload) =>
      apiClient
        .post<LoginResponse>('/api/auth/login', payload)
        .then((res) => res.data),

    onSuccess: (response) => {
      const { accessToken, mustChangePassword, user, role } = response.data;

      // Build user object — API may return user nested or inline
      const userObj = user ?? {
        id: '',
        name: '',
        email: '',
        role: role as 'super_admin' | 'employee',
        mustChangePassword,
      };

      login(accessToken, { ...userObj, mustChangePassword });

      if (mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    },
  });
}
