import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import type { User, ApiResponse } from '@/shared/types';

// ── Payload types ─────────────────────────────────────────────────────────

export interface CreateUserPayload {
  name: string;
  email: string;
  phone?: string;
  tempPassword: string;
}

export interface UpdateUserPayload {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface ResetPasswordPayload {
  id: string;
  newPassword: string;
}

type UserApiError = AxiosError<{ error?: { message?: string }; message?: string }>;

// ── useCreateUser ─────────────────────────────────────────────────────────

export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation<ApiResponse<User>, UserApiError, CreateUserPayload>({
    mutationFn: (payload) =>
      apiClient.post<ApiResponse<User>>('/api/users', payload).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ── useUpdateUser ─────────────────────────────────────────────────────────

export function useUpdateUser() {
  const qc = useQueryClient();

  return useMutation<ApiResponse<User>, UserApiError, UpdateUserPayload>({
    mutationFn: ({ id, ...payload }) =>
      apiClient.put<ApiResponse<User>>(`/api/users/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ── useDeleteUser ─────────────────────────────────────────────────────────

export function useDeleteUser() {
  const qc = useQueryClient();

  return useMutation<ApiResponse<null>, UserApiError, string>({
    mutationFn: (id) =>
      apiClient.delete<ApiResponse<null>>(`/api/users/${id}`).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ── useResetPassword ──────────────────────────────────────────────────────

export function useResetPassword() {
  const qc = useQueryClient();

  return useMutation<ApiResponse<null>, UserApiError, ResetPasswordPayload>({
    mutationFn: ({ id, newPassword }) =>
      apiClient
        .post<ApiResponse<null>>(`/api/users/${id}/reset-password`, { newPassword })
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ── useToggleUserActive ───────────────────────────────────────────────────
// Convenience wrapper: toggles isActive on a user

export function useToggleUserActive() {
  const qc = useQueryClient();

  return useMutation<ApiResponse<User>, UserApiError, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) =>
      apiClient
        .put<ApiResponse<User>>(`/api/users/${id}`, { isActive })
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
