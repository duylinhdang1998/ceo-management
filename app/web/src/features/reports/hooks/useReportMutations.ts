import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { queryKeys } from '@/shared/lib/query-keys';
import type { ApiResponse } from '@/shared/types';
import type { Report, ReportStatus } from './useReports';

// ── Create payload ─────────────────────────────────────────────────────────
export interface CreateReportPayload {
  title: string;
  description?: string;
  status: ReportStatus;
  file?: File; // .html file — multipart
}

// ── Update payload ─────────────────────────────────────────────────────────
export interface UpdateReportPayload {
  id: string;
  title?: string;
  description?: string;
  status?: ReportStatus;
  file?: File; // optional new .html file
}

// ── Build FormData for multipart upload ────────────────────────────────────
function buildFormData(payload: Omit<CreateReportPayload, 'id'>): FormData {
  const form = new FormData();
  form.append('title', payload.title);
  if (payload.description) form.append('description', payload.description);
  form.append('status', payload.status);
  if (payload.file) form.append('file', payload.file);
  return form;
}

// ── useCreateReport ────────────────────────────────────────────────────────
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation<Report, Error, CreateReportPayload>({
    mutationFn: async (payload) => {
      const form = buildFormData(payload);
      const res = await apiClient.post<ApiResponse<Report>>('/api/reports', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all() });
    },
  });
}

// ── useUpdateReport ────────────────────────────────────────────────────────
export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation<Report, Error, UpdateReportPayload>({
    mutationFn: async ({ id, ...payload }) => {
      let res;
      if (payload.file) {
        // Multipart when a new file is included
        const form = new FormData();
        if (payload.title) form.append('title', payload.title);
        if (payload.description) form.append('description', payload.description);
        if (payload.status) form.append('status', payload.status);
        form.append('file', payload.file);
        res = await apiClient.put<ApiResponse<Report>>(`/api/reports/${id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // JSON when only metadata changes
        res = await apiClient.put<ApiResponse<Report>>(`/api/reports/${id}`, payload);
      }
      return res.data.data;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.content(id) });
    },
  });
}

// ── useDeleteReport ────────────────────────────────────────────────────────
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/reports/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all() });
    },
  });
}
