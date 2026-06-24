import { useState, useCallback } from 'react';
import { Send, Sparkles, X, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Tooltip } from '@/shared/ui/Tooltip';
import { cn } from '@/shared/lib/cn';
import { useAiCompose } from '../hooks/useAiCompose';
import { useSendEmail } from '../hooks/useSendEmail';
import { RecipientPicker } from './RecipientPicker';
import { AttachmentPicker } from './AttachmentPicker';
import { TextareaField } from './TextareaField';
import { ReportAttachPopup } from './ReportAttachPopup';
import type { ComposeRecipient } from '../hooks/useAiCompose';
import type { User } from '@/shared/types';

// ── AiEmailComposer ────────────────────────────────────────────────────────
// Full AI email compose + send flow.
// 1. CEO types NL prompt → calls /compose → AI fills recipient, subject, body.
// 2. If requiresRecipientSelection → show RecipientPicker.
// 3. CEO can edit subject/body, pick a report, and attach files.
// 4. CEO clicks Send → calls /send (multipart) → toast handled by parent.

export interface AiEmailComposerProps {
  /** Callbacks after successful send or error — parent shows toast */
  onSendSuccess: () => void;
  onSendError: (message: string) => void;
}

export function AiEmailComposer({
  onSendSuccess,
  onSendError,
}: AiEmailComposerProps) {
  // Prompt state
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState('');

  // Compose result
  const compose = useAiCompose();

  // Recipient: AI-matched or manually selected
  const [recipient, setRecipient] = useState<Pick<User, 'id' | 'name' | 'email'> | null>(null);
  const [requiresRecipientSelection, setRequiresRecipientSelection] = useState(false);
  const [candidates, setCandidates] = useState<Pick<User, 'id' | 'name' | 'email'>[]>([]);

  // Draft fields (editable after compose)
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [bodyError, setBodyError] = useState('');

  // Report link (popup-based)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportTitle, setSelectedReportTitle] = useState<string | null>(null);
  const [reportPopupOpen, setReportPopupOpen] = useState(false);

  // File attachments
  const [files, setFiles] = useState<File[]>([]);

  // Send
  const send = useSendEmail();

  // ── Compose handler ───────────────────────────────────────────────────────
  const handleCompose = useCallback(async () => {
    if (!prompt.trim()) {
      setPromptError('Vui lòng nhập yêu cầu');
      return;
    }
    setPromptError('');

    try {
      const result = await compose.mutateAsync({
        prompt: prompt.trim(),
        ...(selectedReportId ? { reportId: selectedReportId } : {}),
      });

      // Always fill editable fields from AI draft
      setSubject(result.subject ?? '');
      setBody(result.body ?? '');

      if (result.requiresRecipientSelection) {
        setRecipient(null);
        setRequiresRecipientSelection(true);
        setCandidates(result.candidates ?? []);
      } else {
        const r = result.recipient as ComposeRecipient;
        setRecipient({ id: r.userId, name: r.name, email: r.email });
        setRequiresRecipientSelection(false);
        setCandidates([]);
      }
    } catch {
      // Error shown via compose.error below
    }
  }, [prompt, selectedReportId, compose]);

  // ── Recipient selection handler ───────────────────────────────────────────
  const handleSelectRecipient = useCallback(
    async (user: Pick<User, 'id' | 'name' | 'email'>) => {
      setRecipient(user);
      setRequiresRecipientSelection(false);

      // Re-compose with selectedRecipientId so AI regenerates body with correct recipient
      if (prompt.trim()) {
        try {
          const result = await compose.mutateAsync({
            prompt: prompt.trim(),
            selectedRecipientId: user.id,
            ...(selectedReportId ? { reportId: selectedReportId } : {}),
          });
          setSubject(result.subject ?? subject);
          setBody(result.body ?? body);
        } catch {
          // Non-fatal — keep existing draft; user can edit manually
        }
      }
    },
    [prompt, selectedReportId, compose, subject, body],
  );

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    let hasError = false;

    if (!recipient) {
      hasError = true; // RecipientPicker forces selection before reaching here
    }
    if (!subject.trim()) {
      setSubjectError('Vui lòng nhập tiêu đề');
      hasError = true;
    } else {
      setSubjectError('');
    }
    if (!body.trim()) {
      setBodyError('Vui lòng nhập nội dung');
      hasError = true;
    } else {
      setBodyError('');
    }
    if (hasError || !recipient) return;

    try {
      await send.mutateAsync({
        recipientUserId: recipient.id,
        subject: subject.trim(),
        body: body.trim(),
        ...(selectedReportId ? { reportId: selectedReportId } : {}),
        files,
      });
      onSendSuccess();
      // Reset form
      setPrompt('');
      setSubject('');
      setBody('');
      setRecipient(null);
      setRequiresRecipientSelection(false);
      setCandidates([]);
      setSelectedReportId(null);
      setSelectedReportTitle(null);
      setFiles([]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gửi email thất bại. Vui lòng thử lại.';
      onSendError(msg);
    }
  }, [recipient, subject, body, selectedReportId, files, send, onSendSuccess, onSendError]);

  const isDraftReady = Boolean(recipient && subject);

  return (
    <div className="flex flex-col gap-lg">
      {/* ── Step 1: Prompt + Compose button ──────────────────────────────── */}
      <div className="flex flex-col gap-sm">
        <TextareaField
          label="Mô tả yêu cầu email"
          placeholder="Ví dụ: gửi cho Lan link báo cáo doanh thu quý 2..."
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (promptError) setPromptError('');
          }}
          rows={3}
          errorText={promptError}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              void handleCompose();
            }
          }}
        />

        {compose.error && (
          <p className="font-sans text-caption text-error">
            {compose.error.message || 'Không thể kết nối AI. Vui lòng thử lại.'}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleCompose()}
            isLoading={compose.isPending}
            disabled={!prompt.trim()}
          >
            <Sparkles size={14} />
            Tạo nội dung
          </Button>
        </div>
      </div>

      {/* ── Step 2: Recipient selection / display ────────────────────────── */}
      {requiresRecipientSelection ? (
        <RecipientPicker
          candidates={candidates}
          onSelect={(u) => void handleSelectRecipient(u)}
          selectedId={recipient?.id}
        />
      ) : recipient ? (
        <div className="flex items-center gap-sm rounded border border-nav-border bg-bg px-md py-sm">
          <span className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'bg-navy/10 font-heading text-caption font-semibold text-navy',
          )}>
            {recipient.name.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-sans text-body-sm font-medium text-navy">{recipient.name}</span>
            <span className="font-sans text-caption text-helper-text">{recipient.email}</span>
          </span>
          <Tooltip label="Đổi người nhận" side="top">
            <button
              type="button"
              onClick={() => {
                setRecipient(null);
                setRequiresRecipientSelection(false);
              }}
              className="ml-auto text-helper-text transition-colors hover:text-navy"
              aria-label="Đổi người nhận"
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>
      ) : null}

      {/* ── Step 3: Editable subject + body ─────────────────────────────── */}
      {(isDraftReady || compose.isSuccess) && (
        <>
          <Input
            label="Tiêu đề"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (subjectError) setSubjectError('');
            }}
            errorText={subjectError}
            placeholder="Tiêu đề email..."
          />

          <TextareaField
            label="Nội dung"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (bodyError) setBodyError('');
            }}
            rows={8}
            errorText={bodyError}
            placeholder="Nội dung email..."
          />

          {/* ── Step 4: Report attach popup ───────────────────────────── */}
          <div className="flex flex-col gap-xs">
            <label className="font-sans text-body-sm font-medium text-navy">
              Đính kèm báo cáo (tuỳ chọn)
            </label>

            {/* Selected report chip */}
            {selectedReportId && selectedReportTitle ? (
              <div className="flex items-center gap-xs">
                <span
                  className={cn(
                    'flex items-center gap-xs rounded px-sm py-xs',
                    'border border-navy bg-navy font-sans text-caption text-white',
                  )}
                >
                  <LinkIcon size={13} />
                  <span className="max-w-[260px] truncate">{selectedReportTitle}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReportId(null);
                      setSelectedReportTitle(null);
                    }}
                    className="ml-xs opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Bỏ chọn báo cáo"
                  >
                    <X size={12} />
                  </button>
                </span>
              </div>
            ) : null}

            {/* Trigger button */}
            <div>
              {recipient ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReportPopupOpen(true)}
                  className="h-7 px-sm py-0 text-[12px] gap-[4px]"
                >
                  <LinkIcon size={12} />
                  {selectedReportId ? 'Đổi báo cáo' : 'Đính kèm báo cáo'}
                </Button>
              ) : (
                <Tooltip label="Chọn người nhận trước" side="top">
                  <span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled
                      className="h-7 px-sm py-0 text-[12px] gap-[4px] cursor-not-allowed"
                    >
                      <LinkIcon size={12} />
                      Đính kèm báo cáo
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Popup */}
          {recipient && (
            <ReportAttachPopup
              open={reportPopupOpen}
              onOpenChange={setReportPopupOpen}
              recipientUserId={recipient.id}
              selectedReportId={selectedReportId}
              onSelect={(r) => {
                setSelectedReportId(r.id);
                setSelectedReportTitle(r.title);
              }}
            />
          )}

          {/* ── Step 5: File attachments ──────────────────────────────── */}
          <AttachmentPicker files={files} onChange={setFiles} />

          {/* ── Step 6: Send ──────────────────────────────────────────── */}
          {send.error && (
            <p className="font-sans text-caption text-error">
              {send.error.message || 'Gửi email thất bại. Vui lòng thử lại.'}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void handleSend()}
              isLoading={send.isPending}
              disabled={!recipient}
            >
              <Send size={15} />
              Gửi
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
