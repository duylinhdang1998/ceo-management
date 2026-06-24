import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';

// ── API types — mirrors BE 3.2 POST /api/email/send (multipart) ──────────

export interface SendEmailPayload {
  recipientUserId: string;
  subject: string;
  body: string;
  reportId?: string;
  /** Local File objects — sent as multipart/form-data */
  files?: File[];
}

export interface SendEmailResult {
  messageId: string;
}

// ── Build multipart FormData ──────────────────────────────────────────────

function buildSendForm(payload: SendEmailPayload): FormData {
  const form = new FormData();
  form.append('recipientUserId', payload.recipientUserId);
  form.append('subject', payload.subject);
  form.append('body', payload.body);
  if (payload.reportId) form.append('reportId', payload.reportId);
  payload.files?.forEach((file) => form.append('files', file));
  return form;
}

// ── useSendEmail mutation ─────────────────────────────────────────────────

export function useSendEmail() {
  return useMutation<SendEmailResult, Error, SendEmailPayload>({
    mutationFn: async (payload) => {
      const form = buildSendForm(payload);
      const res = await apiClient.post<{ success: boolean; data: SendEmailResult }>(
        '/api/email/send',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data.data;
    },
  });
}
