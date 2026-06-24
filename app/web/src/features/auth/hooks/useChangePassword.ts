import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import { useAuthStore } from '@/shared/stores/authStore';
import type { ApiResponse } from '@/shared/types';

// ── Change-password API contract ──────────────────────────────────────────
interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

interface ChangePasswordData {
  message: string;
}

type ChangePasswordResponse = ApiResponse<ChangePasswordData>;

// ── useChangePassword hook ────────────────────────────────────────────────
export function useChangePassword() {
  const navigate = useNavigate();
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);

  return useMutation<
    ChangePasswordResponse,
    AxiosError<{ error?: { message?: string }; message?: string }>,
    ChangePasswordPayload
  >({
    mutationFn: (payload) =>
      apiClient
        .post<ChangePasswordResponse>('/api/auth/change-password', payload)
        .then((res) => res.data),

    onSuccess: () => {
      // Clear mustChangePassword flag — allows AuthGuard to pass through
      setMustChangePassword(false);
      navigate('/', { replace: true });
    },
  });
}
