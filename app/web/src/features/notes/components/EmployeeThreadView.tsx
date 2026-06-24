import { NoteItem } from './NoteItem';
import type { Note } from '../hooks/useNotes';
import type { NoteItemProps } from './NoteItem';

// ── EmployeeThreadView ─────────────────────────────────────────────────────
// Renders all notes returned by the API (already filtered to own thread by BE).
// Root notes are shown; their children (replies) are rendered by NoteItem.

interface EmployeeThreadViewProps {
  notes: Note[];
  noteItemSharedProps: Omit<NoteItemProps, 'note' | 'depth'>;
}

export function EmployeeThreadView({
  notes,
  noteItemSharedProps,
}: EmployeeThreadViewProps) {
  const rootNotes = notes.filter((n) => n.parentId === null);

  if (rootNotes.length === 0) {
    return (
      <p className="font-sans text-body-sm text-helper-text">
        Bạn chưa có ghi chú nào trên báo cáo này.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {rootNotes.map((note) => (
        <NoteItem key={note.id} note={note} depth={0} {...noteItemSharedProps} />
      ))}
    </div>
  );
}
