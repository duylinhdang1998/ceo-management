import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import type { Pagination } from '@/shared/types';
import type { Report } from '@/shared/types/report.types';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AssignedReportsPage {
  data: Report[];
  meta: Pagination;
}

// ── API call ──────────────────────────────────────────────────────────────

async function fetchAssignedReports(
  userId: string,
  search: string,
  page: number,
): Promise<AssignedReportsPage> {
  const res = await apiClient.get<{ success: boolean; data: Report[]; meta: Pagination }>(
    '/api/reports',
    {
      params: {
        assignedTo: userId,
        search: search || undefined,
        page,
        limit: 15,
      },
    },
  );
  return { data: res.data.data, meta: res.data.meta };
}

// ── useAssignedReports ─────────────────────────────────────────────────────
// Fetches reports assigned to a specific employee. Used by the report-attach
// popup in the AI email composer.

export function useAssignedReports(userId: string | null, search: string, page: number) {
  return useQuery<AssignedReportsPage>({
    queryKey: ['reports', 'assigned', userId, search, page],
    queryFn: () => fetchAssignedReports(userId!, search, page),
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
