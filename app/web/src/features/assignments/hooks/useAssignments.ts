import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import type { User, ApiResponse } from '@/shared/types';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ReportDetail {
  id: string;
  title: string;
  status: 'draft' | 'published';
  assignees?: User[];
  [key: string]: unknown;
}

export interface AssignPayload {
  reportId: string;
  userIds: string[];
}

export interface UnassignPayload {
  reportId: string;
  userIds: string[];
}

type AssignmentError = AxiosError<{ error?: { message?: string }; message?: string }>;

// ── Fetch report detail (includes assignees if backend provides them) ──────
// Strategy: GET /api/reports/:id — the backend's report detail response
// is expected to include an `assignees` array. If not available, we fetch
// GET /api/reports/:id/assignments as fallback.

async function fetchReportDetail(reportId: string): Promise<ReportDetail> {
  const res = await apiClient.get<ApiResponse<ReportDetail>>(`/api/reports/${reportId}`);
  return res.data.data;
}

async function fetchReportAssignees(reportId: string): Promise<User[]> {
  try {
    // Preferred: dedicated endpoint GET /api/reports/:id/assignments
    const res = await apiClient.get<ApiResponse<User[]>>(
      `/api/reports/${reportId}/assignments`,
    );
    return res.data.data;
  } catch {
    // Fallback: return empty list if endpoint doesn't exist yet (BE in progress)
    return [];
  }
}

// ── useReportDetail ───────────────────────────────────────────────────────

export function useReportDetail(reportId: string) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: () => fetchReportDetail(reportId),
    enabled: Boolean(reportId),
    staleTime: 30_000,
  });
}

// ── useReportAssignees ────────────────────────────────────────────────────
// Lists users currently assigned to the report.
// Prefers data.assignees from report detail; falls back to /assignments endpoint.

export function useReportAssignees(reportId: string, reportDetail?: ReportDetail) {
  return useQuery({
    queryKey: ['report-assignees', reportId],
    queryFn: () => {
      if (reportDetail?.assignees) return reportDetail.assignees;
      return fetchReportAssignees(reportId);
    },
    enabled: Boolean(reportId),
    staleTime: 30_000,
  });
}

// ── useAssign ─────────────────────────────────────────────────────────────

export function useAssign() {
  const qc = useQueryClient();

  return useMutation<ApiResponse<unknown>, AssignmentError, AssignPayload>({
    mutationFn: ({ reportId, userIds }) =>
      apiClient
        .post<ApiResponse<unknown>>(`/api/reports/${reportId}/assignments`, { userIds })
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['report', variables.reportId] });
      void qc.invalidateQueries({ queryKey: ['report-assignees', variables.reportId] });
    },
  });
}

// ── useUnassign ───────────────────────────────────────────────────────────

export function useUnassign() {
  const qc = useQueryClient();

  return useMutation<ApiResponse<unknown>, AssignmentError, UnassignPayload>({
    mutationFn: ({ reportId, userIds }) =>
      apiClient
        .delete<ApiResponse<unknown>>(`/api/reports/${reportId}/assignments`, {
          data: { userIds },
        })
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['report', variables.reportId] });
      void qc.invalidateQueries({ queryKey: ['report-assignees', variables.reportId] });
    },
  });
}
