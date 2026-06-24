-- Migration 004: Create notes table
-- Private notes per employee per report, nested max 2 levels (app-level enforced).
-- thread_owner_id = the employee who "owns" the note thread (visibility control).

CREATE TABLE IF NOT EXISTS notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  thread_owner_id uuid        NOT NULL REFERENCES users(id),
  author_id       uuid        NOT NULL REFERENCES users(id),
  parent_id       uuid        REFERENCES notes(id),
  content         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- Index for fetching notes by report + thread owner (most common query)
CREATE INDEX IF NOT EXISTS notes_report_thread_idx
  ON notes (report_id, thread_owner_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS notes_parent_idx ON notes (parent_id) WHERE parent_id IS NOT NULL;
