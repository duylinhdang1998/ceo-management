import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { queryKeys } from '@/shared/lib/query-keys';

// ── Create PAT ─────────────────────────────────────────────────────────────

export interface CreatePatPayload {
  name: string;
}

export interface CreatePatResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    token: string; // plaintext — returned ONCE
    createdAt: string;
  };
}

export function useCreateToken() {
  const queryClient = useQueryClient();

  return useMutation<CreatePatResponse, Error, CreatePatPayload>({
    mutationFn: async (payload) => {
      const res = await apiClient.post<CreatePatResponse>('/api/auth/tokens', payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tokens.all() });
    },
  });
}

// ── Revoke PAT ────────────────────────────────────────────────────────────

export function useRevokeToken() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/auth/tokens/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tokens.all() });
    },
  });
}
