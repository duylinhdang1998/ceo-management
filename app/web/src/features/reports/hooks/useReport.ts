import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { queryKeys } from '@/shared/lib/query-keys';
import type { ApiResponse } from '@/shared/types';
import type { Report } from './useReports';

// ── useReport — single report detail ───────────────────────────────────────
export function useReport(id: string) {
  return useQuery<Report>({
    queryKey: queryKeys.reports.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Report>>(`/api/reports/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// ── useReportViewToken — GET /api/reports/:id/view-token ──────────────────
// Fetches a short-lived JWT view-token used to authenticate the iframe src URL.
// Token expires in 5 minutes (server-side); staleTime is kept short so a
// re-mount gets a fresh token before the previous one expires.
export function useReportViewToken(id: string) {
  return useQuery<string>({
    queryKey: queryKeys.reports.viewToken(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ token: string }>>(
        `/api/reports/${id}/view-token`,
      );
      return res.data.data.token;
    },
    enabled: Boolean(id),
    // Keep well under the 5 min server expiry to avoid serving stale tokens
    staleTime: 3 * 60_000,
    gcTime: 5 * 60_000,
    // Do not retry aggressively — 403 means no access
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
}

// ── useReportContent — fetches HTML content as text ────────────────────────
// Kept for backwards compatibility; no longer used by ReportIframe (which now
// uses the token-based src approach) but may still be used by other consumers.
export function useReportContent(id: string) {
  return useQuery<string>({
    queryKey: queryKeys.reports.content(id),
    queryFn: async () => {
      const res = await apiClient.get<string>(`/api/reports/${id}/content`, {
        responseType: 'text',
        headers: {
          Accept: 'text/html',
        },
      });
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
