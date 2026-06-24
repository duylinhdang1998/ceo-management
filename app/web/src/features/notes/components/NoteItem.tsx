import { useState } from 'react';
import { Pencil, Trash2, Reply } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import { cn } from '@/shared/lib/cn';
import { formatRelativeTime } from '@/shared/lib/format';
import { NoteForm } from './NoteForm';
import { useUpdateNote } from '../hooks/useNoteMutations';
import { useDeleteNote } from '../hooks/useNoteMutations';
import type { Note } from '../hooks/useNotes';

// ── NoteItem ───────────────────────────────────────────────────────────────
// Renders a single note and its direct children (replies) in a Facebook-style
// comment bubble layout:
//   • Avatar (initials circle) on the left
//   • Light gray bubble to the right: author bold + note text inside
//   • Under the bubble: actions row (Phản hồi, timestamp, edit/delete)
//   • Replies indented below, with a subtle left connector line
//   • Reply NoteForm renders AFTER children (bottom of thread, FB-style)
//
// Depth cap: Reply button is hidden at depth >= 1 (2-level max).

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
  const canEdit = isOwn;
  const canDelete = isOwn || isAdmin;

  // UI nesting cap: hide Reply button at depth >= 1
  const canReply = depth === 0;

  const authorLabel = note.author?.name ?? note.author?.email ?? 'Người dùng';

  // Avatar size and color: root = larger + navy, reply = smaller + sage
  const avatarSize = depth === 0 ? 'h-8 w-8 text-caption' : 'h-6 w-6 text-[10px]';
  const avatarColor = depth === 0 ? 'bg-navy' : 'bg-sage';

  const handleEdit = async (content: string) => {
    await updateNote({ noteId: note.id, reportId, content });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteNote({ noteId: note.id, reportId });
  };

  return (
    <div className="flex flex-col gap-[10px]">
      {/* ── Comment row: avatar + bubble ──────────────────────────────── */}
      <div className="flex items-start gap-sm">
        {/* Avatar */}
        <span
          className={cn(
            'shrink-0 flex items-center justify-center rounded-full font-heading font-semibold text-white',
            avatarSize,
            avatarColor,
          )}
        >
          {authorLabel.charAt(0).toUpperCase()}
        </span>

        {/* Bubble */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <NoteForm
              defaultValue={note.content}
              onSubmit={handleEdit}
              onCancel={() => setIsEditing(false)}
              compact
            />
          ) : (
            <div className="inline-block max-w-full rounded-2xl bg-ghost-hover px-[12px] py-[8px]">
              {/* Author name bold, small */}
              <p className="font-sans text-caption font-semibold text-navy leading-tight mb-[2px]">
                {authorLabel}
                {depth > 0 && (
                  <span className="ml-xs font-normal text-helper-text">(phản hồi)</span>
                )}
              </p>
              {/* Note text */}
              <p className="font-sans text-body-sm text-navy whitespace-pre-wrap break-words">
                {note.content}
              </p>
            </div>
          )}

          {/* Actions row — under the bubble, outside it */}
          {!isEditing && (
            <div className="mt-[4px] flex items-center gap-[10px] pl-[2px]">
              {/* Reply — depth=0 only */}
              {canReply && (
                <button
                  type="button"
                  onClick={() => onReply(note.id)}
                  className="inline-flex items-center gap-[3px] font-sans text-caption font-semibold text-helper-text hover:text-navy transition-colors"
                  aria-label="Phản hồi"
                >
                  <Reply size={11} />
                  Phản hồi
                </button>
              )}

              {/* Relative timestamp */}
              <span className="font-sans text-caption text-helper-text">
                {formatRelativeTime(note.createdAt)}
              </span>

              {canEdit && (
                <Tooltip label="Sửa" side="top">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    disabled={isDeleting || isUpdating}
                    className="h-auto p-[2px] text-caption text-helper-text hover:text-navy"
                    aria-label="Sửa ghi chú"
                  >
                    <Pencil size={12} />
                  </Button>
                </Tooltip>
              )}

              {canDelete && (
                <Tooltip label="Xoá" side="top">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    isLoading={isDeleting}
                    disabled={isUpdating}
                    className="h-auto p-[2px] text-caption text-helper-text hover:text-error"
                    aria-label="Xoá ghi chú"
                  >
                    <Trash2 size={12} />
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Replies (children) — rendered BEFORE the reply input, indented ── */}
      {note.children && note.children.length > 0 && (
        <div className="flex flex-col gap-[10px] ml-[40px] pl-[12px] border-l-2 border-nav-border">
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

      {/* ── Inline reply form — AFTER children (bottom of thread, FB-style) ── */}
      {canReply && replyingToId === note.id && (
        <div className="ml-[40px] pl-[12px] border-l-2 border-sage">
          <NoteForm
            placeholder="Viết phản hồi…"
            onSubmit={(content) => onSubmitReply(note.id, content)}
            onCancel={onCancelReply}
            compact
          />
        </div>
      )}
    </div>
  );
}
