import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { queryKeys } from '@/shared/lib/query-keys';
import type { ApiResponse } from '@/shared/types';
import type { Note } from './useNotes';

// ── Payload types ──────────────────────────────────────────────────────────

export interface CreateNotePayload {
  reportId: string;
  content: string;
  parentId?: string;
}

export interface UpdateNotePayload {
  noteId: string;
  reportId: string;
  content: string;
}

// ── useCreateNote ──────────────────────────────────────────────────────────

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation<Note, Error, CreateNotePayload>({
    mutationFn: async ({ reportId, content, parentId }) => {
      const res = await apiClient.post<ApiResponse<Note>>(
        `/api/reports/${reportId}/notes`,
        { content, ...(parentId ? { parentId } : {}) },
      );
      return res.data.data;
    },
    onSuccess: (_, { reportId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notes.byReport(reportId),
      });
    },
  });
}

// ── useUpdateNote ──────────────────────────────────────────────────────────

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation<Note, Error, UpdateNotePayload>({
    mutationFn: async ({ reportId, noteId, content }) => {
      const res = await apiClient.put<ApiResponse<Note>>(
        `/api/reports/${reportId}/notes/${noteId}`,
        { content },
      );
      return res.data.data;
    },
    onSuccess: (_, { reportId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notes.byReport(reportId),
      });
    },
  });
}

// ── useDeleteNote ──────────────────────────────────────────────────────────

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { noteId: string; reportId: string }>({
    mutationFn: async ({ reportId, noteId }) => {
      await apiClient.delete(`/api/reports/${reportId}/notes/${noteId}`);
    },
    onSuccess: (_, { reportId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notes.byReport(reportId),
      });
    },
  });
}
