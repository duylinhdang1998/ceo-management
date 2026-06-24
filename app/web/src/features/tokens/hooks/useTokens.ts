import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { queryKeys } from '@/shared/lib/query-keys';

// ── PAT domain types ──────────────────────────────────────────────────────

export interface Pat {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface PatListResponse {
  success: boolean;
  data: Pat[];
}

// ── useTokens — fetch all PATs for the current super_admin ───────────────

export function useTokens() {
  return useQuery<PatListResponse>({
    queryKey: queryKeys.tokens.all(),
    queryFn: async () => {
      const res = await apiClient.get<PatListResponse>('/api/auth/tokens');
      return res.data;
    },
    staleTime: 30_000,
  });
}
