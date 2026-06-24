import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import type { User } from '@/shared/types';

// ── API types — mirrors BE 3.2 POST /api/email/compose ───────────────────

export interface ComposeRequest {
  prompt: string;
  /** CEO manually selected after requiresRecipientSelection=true */
  selectedRecipientId?: string;
  /** Optional: attach a report link in the email body */
  reportId?: string;
}

export interface ComposeRecipient {
  userId: string;
  email: string;
  name: string;
}

export interface ComposeResult {
  /** Null when requiresRecipientSelection=true */
  recipient: ComposeRecipient | null;
  /** True when AI could not match a unique employee */
  requiresRecipientSelection: boolean;
  subject: string;
  body: string;
  reportLink: string | null;
  /** Candidate list supplied when requiresRecipientSelection=true */
  candidates?: Pick<User, 'id' | 'name' | 'email'>[];
}

// ── useAiCompose mutation ─────────────────────────────────────────────────

export function useAiCompose() {
  return useMutation<ComposeResult, Error, ComposeRequest>({
    mutationFn: async (payload) => {
      const res = await apiClient.post<{ success: boolean; data: ComposeResult }>(
        '/api/email/compose',
        payload,
      );
      return res.data.data;
    },
  });
}
