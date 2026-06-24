import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import { queryKeys } from '@/shared/lib/query-keys';
import type { ApiResponse } from '@/shared/types';

// ── Note domain types ──────────────────────────────────────────────────────

export interface NoteAuthor {
  id: string;
  name: string;
  email: string;
}

export interface Note {
  id: string;
  content: string;
  reportId: string;
  authorId: string;
  author: NoteAuthor;
  threadOwnerId: string;
  threadOwner?: NoteAuthor;
  parentId: string | null;
  depth: number; // 0 = root, 1 = reply
  children: Note[];
  createdAt: string;
  updatedAt: string;
}

// ── useNotes — fetch all notes for a report ────────────────────────────────
// Employee: returns only own thread (root + replies)
// CEO (super_admin): returns all threads grouped by owner

export function useNotes(reportId: string) {
  return useQuery<Note[]>({
    queryKey: queryKeys.notes.byReport(reportId),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Note[]>>(
        `/api/reports/${reportId}/notes`,
      );
      return res.data.data;
    },
    enabled: Boolean(reportId),
    staleTime: 15_000,
  });
}
