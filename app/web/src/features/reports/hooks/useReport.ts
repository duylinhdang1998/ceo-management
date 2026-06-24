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

// ── useReportContent — fetches HTML content as text ────────────────────────
// Returns the raw HTML string to be rendered in an iframe via srcDoc.
// This avoids creating an object URL (no need to revoke), and the JWT
// is attached by api-client's request interceptor (Bearer token).
// XSS note: the sandbox attribute on the iframe prevents scripts from
// accessing the parent page. See ReportIframe.tsx for the full security note.
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
