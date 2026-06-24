import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useNotes } from '../hooks/useNotes';
import { useCreateNote } from '../hooks/useNoteMutations';
import { NoteForm } from './NoteForm';
import { EmployeeThreadView } from './EmployeeThreadView';
import { AdminThreadsView } from './AdminThreadsView';

// ── NotePanel ──────────────────────────────────────────────────────────────
// Shown below the report iframe on ReportViewPage.
//
// Employee view  → single thread (own notes only, enforced by API)
// CEO view       → all employee threads grouped by thread owner
//
// Root-note creation is EMPLOYEE-ONLY. The backend returns 400 CEO_MUST_REPLY
// when an admin tries to create a root note, so the form is hidden for admins.
// CEO can still reply within any employee thread.
//
// Reply nesting cap: depth 0 = root note, depth 1 = reply.
// The Reply button is hidden on depth=1 items (NoteItem enforces this).
// The API also returns 400 for level-3 attempts — UI and API both defend.

export interface NotePanelProps {
  reportId: string;
  currentUserId: string;
  isAdmin: boolean;
  className?: string;
}

export function NotePanel({
  reportId,
  currentUserId,
  isAdmin,
  className,
}: NotePanelProps) {
  const { data: notes = [], isLoading, isError } = useNotes(reportId);
  const { mutateAsync: createNote } = useCreateNote();

  // Track which note id is showing the inline reply form
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const handleCreateRoot = async (content: string) => {
    await createNote({ reportId, content });
  };

  const handleSubmitReply = async (parentId: string, content: string) => {
    await createNote({ reportId, content, parentId });
    setReplyingToId(null);
  };

  const handleReply = (parentId: string) => {
    setReplyingToId((prev) => (prev === parentId ? null : parentId));
  };

  const handleCancelReply = () => setReplyingToId(null);

  // Shared props passed to every NoteItem
  const noteItemSharedProps = {
    reportId,
    currentUserId,
    isAdmin,
    replyingToId,
    onReply: handleReply,
    onSubmitReply: handleSubmitReply,
    onCancelReply: handleCancelReply,
  };

  return (
    <section
      className={cn('flex flex-col gap-lg', className)}
      aria-label="Ghi chú"
    >
      {/* Section heading */}
      <div className="flex items-center gap-sm border-b border-nav-border pb-sm">
        <MessageSquare size={18} className="text-helper-text" />
        <h2 className="font-heading text-h4 text-navy">Ghi chú</h2>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col gap-sm">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded border border-nav-border bg-ghost-hover"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <p className="font-sans text-body-sm text-error">
          Không thể tải ghi chú. Vui lòng thử lại.
        </p>
      )}

      {/* CEO view: threads grouped by employee */}
      {!isLoading && !isError && isAdmin && (
        <AdminThreadsView
          notes={notes}
          noteItemSharedProps={noteItemSharedProps}
        />
      )}

      {/* Employee view: own thread + root note form */}
      {!isLoading && !isError && !isAdmin && (
        <>
          <EmployeeThreadView
            notes={notes}
            noteItemSharedProps={noteItemSharedProps}
          />

          {/* Root note form — employees only (CEO_MUST_REPLY enforced by API) */}
          <div className="border-t border-nav-border pt-md">
            <p className="mb-sm font-sans text-caption text-helper-text">
              Thêm ghi chú của bạn
            </p>
            <NoteForm
              placeholder="Viết ghi chú mới…"
              onSubmit={handleCreateRoot}
            />
          </div>
        </>
      )}
    </section>
  );
}
