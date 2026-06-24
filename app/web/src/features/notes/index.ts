// ── Notes feature public API ───────────────────────────────────────────────

// Hooks
export { useNotes } from './hooks/useNotes';
export type { Note, NoteAuthor } from './hooks/useNotes';
export { useCreateNote, useUpdateNote, useDeleteNote } from './hooks/useNoteMutations';
export type { CreateNotePayload, UpdateNotePayload } from './hooks/useNoteMutations';

// Components
export { NotePanel } from './components/NotePanel';
export { NoteItem } from './components/NoteItem';
export { NoteForm } from './components/NoteForm';
export { EmployeeThreadView } from './components/EmployeeThreadView';
export { AdminThreadsView } from './components/AdminThreadsView';
