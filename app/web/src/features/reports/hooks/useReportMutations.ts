import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { queryKeys } from '@/shared/lib/query-keys';
import type { ApiResponse } from '@/shared/types';
import type { Report } from './useReports';

// ── Create payload — NO status (backend sets published by default) ─────────
export interface CreateReportPayload {
  title: string;
  description?: string;
  file?: File; // .html file — multipart
}

// ── Update payload ─────────────────────────────────────────────────────────
export interface UpdateReportPayload {
  id: string;
  title?: string;
  description?: string;
  status?: 'draft' | 'published';
  file?: File; // optional new .html file
}

// ── Build FormData for multipart upload (create) ───────────────────────────
function buildCreateFormData(payload: CreateReportPayload): FormData {
  const form = new FormData();
  form.append('title', payload.title);
  if (payload.description) form.append('description', payload.description);
  if (payload.file) form.append('file', payload.file);
  return form;
}

// ── useCreateReport ────────────────────────────────────────────────────────
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation<Report, Error, CreateReportPayload>({
    mutationFn: async (payload) => {
      const form = buildCreateFormData(payload);
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
        if (payload.description !== undefined) form.append('description', payload.description);
        if (payload.status) form.append('status', payload.status);
        form.append('file', payload.file);
        res = await apiClient.put<ApiResponse<Report>>(`/api/reports/${id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // JSON when only metadata changes
        const { file: _file, ...metaPayload } = payload;
        res = await apiClient.put<ApiResponse<Report>>(`/api/reports/${id}`, metaPayload);
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

// ── useReplaceAssignments — PUT /api/reports/:id/assignments ───────────────
export interface AssigneePermissions {
  userId: string;
  canEdit: boolean;
  canDownload: boolean;
}

export interface ReplaceAssignmentsPayload {
  reportId: string;
  assignees: AssigneePermissions[];
}

export function useReplaceAssignments() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ReplaceAssignmentsPayload>({
    mutationFn: async ({ reportId, assignees }) => {
      await apiClient.put(`/api/reports/${reportId}/assignments`, { assignees });
    },
    onSuccess: (_data, { reportId }) => {
      void queryClient.invalidateQueries({ queryKey: ['report-assignees', reportId] });
      void queryClient.invalidateQueries({ queryKey: ['report', reportId] });
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

// ── useBulkDeleteReports ───────────────────────────────────────────────────
export interface BulkDeleteReportsPayload {
  ids: string[];
}

export interface BulkDeleteReportsResult {
  deleted: number;
}

export function useBulkDeleteReports() {
  const queryClient = useQueryClient();

  return useMutation<BulkDeleteReportsResult, Error, BulkDeleteReportsPayload>({
    mutationFn: async (payload) => {
      const res = await apiClient.post<ApiResponse<BulkDeleteReportsResult>>(
        '/api/reports/bulk-delete',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all() });
    },
  });
}
