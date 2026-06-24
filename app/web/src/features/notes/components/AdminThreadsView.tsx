import { NoteItem } from './NoteItem';
import type { Note } from '../hooks/useNotes';
import type { NoteItemProps } from './NoteItem';

// ── AdminThreadsView ───────────────────────────────────────────────────────
// Groups root notes by threadOwnerId and renders each employee's thread
// under a labelled header. CEO can reply within threads but cannot create
// new root notes (backend returns 400 CEO_MUST_REPLY for root creation).

interface AdminThreadsViewProps {
  notes: Note[];
  noteItemSharedProps: Omit<NoteItemProps, 'note' | 'depth'>;
}

/** Group root-level notes by threadOwnerId. */
function groupByOwner(notes: Note[]): Map<string, Note[]> {
  const map = new Map<string, Note[]>();
  for (const note of notes) {
    if (note.parentId !== null) continue;
    const key = note.threadOwnerId;
    const existing = map.get(key) ?? [];
    existing.push(note);
    map.set(key, existing);
  }
  return map;
}

export function AdminThreadsView({
  notes,
  noteItemSharedProps,
}: AdminThreadsViewProps) {
  const grouped = groupByOwner(notes);

  if (grouped.size === 0) {
    return (
      <p className="font-sans text-body-sm text-helper-text">
        Chưa có nhân viên nào ghi chú trên báo cáo này.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-xl">
      {Array.from(grouped.entries()).map(([, ownerNotes]) => {
        const firstNote = ownerNotes[0];
        const ownerName =
          firstNote?.threadOwner?.name ??
          firstNote?.threadOwner?.email ??
          firstNote?.author?.name ??
          'Nhân viên';

        return (
          <div key={firstNote?.threadOwnerId ?? ownerName} className="flex flex-col gap-sm">
            {/* Employee thread header */}
            <div className="flex items-center gap-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage font-heading text-caption font-semibold text-white">
                {ownerName.charAt(0).toUpperCase()}
              </span>
              <span className="font-heading text-body-sm font-medium text-navy">
                {ownerName}
              </span>
              <span className="font-sans text-caption text-helper-text">
                ({ownerNotes.length} ghi chú)
              </span>
            </div>

            {/* Notes in this thread */}
            <div className="flex flex-col gap-md">
              {ownerNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  depth={0}
                  {...noteItemSharedProps}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
