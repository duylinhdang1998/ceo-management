import { useState } from 'react';
import { Pencil, Trash2, Reply } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';
import { formatRelativeTime } from '@/shared/lib/format';
import { NoteForm } from './NoteForm';
import { useUpdateNote } from '../hooks/useNoteMutations';
import { useDeleteNote } from '../hooks/useNoteMutations';
import type { Note } from '../hooks/useNotes';

// ── NoteItem ───────────────────────────────────────────────────────────────
// Renders a single note and its direct children (replies).
// Depth cap: Reply button is hidden/disabled at depth >= 1 (only root notes
// can receive replies; depth=0 → can reply, depth=1 → no reply button shown).
// This enforces the 2-level nesting rule in the UI (API also returns 400).

export interface NoteItemProps {
  note: Note;
  reportId: string;
  currentUserId: string;
  isAdmin: boolean;
  /** Current nesting depth: 0 = root, 1 = reply */
  depth?: number;
  onReply: (parentId: string) => void;
  /** Which parentId is currently showing the inline reply form */
  replyingToId: string | null;
  onSubmitReply: (parentId: string, content: string) => Promise<void>;
  onCancelReply: () => void;
}

export function NoteItem({
  note,
  reportId,
  currentUserId,
  isAdmin,
  depth = 0,
  onReply,
  replyingToId,
  onSubmitReply,
  onCancelReply,
}: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const { mutateAsync: updateNote, isPending: isUpdating } = useUpdateNote();
  const { mutateAsync: deleteNote, isPending: isDeleting } = useDeleteNote();

  const isOwn = note.authorId === currentUserId;
  const canEdit = isOwn; // Only author can edit
  const canDelete = isOwn || isAdmin; // Author or CEO can delete

  // UI nesting cap: hide Reply button at depth >= 1
  const canReply = depth === 0;

  const authorLabel = note.author?.name ?? note.author?.email ?? 'Người dùng';

  const handleEdit = async (content: string) => {
    await updateNote({ noteId: note.id, reportId, content });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteNote({ noteId: note.id, reportId });
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-xs',
        depth > 0 && 'ml-lg pl-md border-l-2 border-nav-border',
      )}
    >
      {/* Note card */}
      <div className="rounded border border-nav-border bg-surface p-md shadow-sm">
        {/* Header: author + timestamp */}
        <div className="mb-sm flex items-center justify-between gap-sm">
          <div className="flex items-center gap-sm min-w-0">
            {/* Avatar circle */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy font-heading text-caption font-semibold text-white">
              {authorLabel.charAt(0).toUpperCase()}
            </span>
            <span className="font-sans text-body-sm font-medium text-navy truncate">
              {authorLabel}
            </span>
            {depth > 0 && (
              <span className="font-sans text-caption text-helper-text shrink-0">
                (phản hồi)
              </span>
            )}
          </div>
          <span className="font-sans text-caption text-helper-text shrink-0">
            {formatRelativeTime(note.createdAt)}
          </span>
        </div>

        {/* Content or edit form */}
        {isEditing ? (
          <NoteForm
            defaultValue={note.content}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            compact
          />
        ) : (
          <p className="font-sans text-body-sm text-navy whitespace-pre-wrap break-words">
            {note.content}
          </p>
        )}

        {/* Action row */}
        {!isEditing && (
          <div className="mt-sm flex items-center gap-xs">
            {/* Reply — only visible on depth=0 notes */}
            {canReply && (
              <button
                type="button"
                onClick={() => onReply(note.id)}
                className="inline-flex items-center gap-xs font-sans text-caption text-helper-text hover:text-navy transition-colors"
                aria-label="Phản hồi"
              >
                <Reply size={13} />
                Phản hồi
              </button>
            )}

            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isDeleting || isUpdating}
                className="h-auto p-xs text-caption text-helper-text hover:text-navy"
                aria-label="Sửa ghi chú"
              >
                <Pencil size={13} />
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
                disabled={isUpdating}
                className="h-auto p-xs text-caption text-helper-text hover:text-error"
                aria-label="Xóa ghi chú"
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Inline reply form — shown directly under the note being replied to */}
      {canReply && replyingToId === note.id && (
        <div className="ml-lg pl-md border-l-2 border-sage">
          <NoteForm
            placeholder="Viết phản hồi…"
            onSubmit={(content) => onSubmitReply(note.id, content)}
            onCancel={onCancelReply}
            compact
          />
        </div>
      )}

      {/* Children (replies) — rendered at depth+1, capped display at depth=1 */}
      {note.children && note.children.length > 0 && (
        <div className="flex flex-col gap-xs">
          {note.children.map((child) => (
            <NoteItem
              key={child.id}
              note={child}
              reportId={reportId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              depth={depth + 1}
              onReply={onReply}
              replyingToId={replyingToId}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
