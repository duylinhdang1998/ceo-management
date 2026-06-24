import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import type { User, ApiResponse, Pagination } from '@/shared/types';

// ── API types ─────────────────────────────────────────────────────────────

export interface UsersQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface UsersPage {
  users: User[];
  meta: Pagination;
}

// ── API call ──────────────────────────────────────────────────────────────

async function fetchUsers(params: UsersQueryParams): Promise<UsersPage> {
  const response = await apiClient.get<ApiResponse<User[]>>('/api/users', {
    params: {
      search: params.search || undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return {
    users: response.data.data,
    meta: response.data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

// ── useUsers hook ─────────────────────────────────────────────────────────

export function useUsers(params: UsersQueryParams = {}) {
  return useQuery({
    queryKey: ['users', params.search ?? '', params.page ?? 1, params.limit ?? 20],
    queryFn: () => fetchUsers(params),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
