import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { queryKeys } from '@/shared/lib/query-keys';
import type { Pagination } from '@/shared/types';
import type { Report, ReportStatus, ReportListParams } from '@/shared/types/report.types';

// Re-export so existing consumers of this hook keep working
export type { Report, ReportStatus, ReportListParams };

export interface ReportListResponse {
  success: boolean;
  data: Report[];
  meta: Pagination;
}

// ── useReports — paginated list ─────────────────────────────────────────────
export function useReports(params: ReportListParams = {}) {
  const { page = 1, limit = 20, search = '' } = params;

  return useQuery<ReportListResponse>({
    queryKey: queryKeys.reports.list({ page, limit, search }),
    queryFn: async () => {
      const res = await apiClient.get<ReportListResponse>('/api/reports', {
        params: { page, limit, ...(search ? { search } : {}) },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
