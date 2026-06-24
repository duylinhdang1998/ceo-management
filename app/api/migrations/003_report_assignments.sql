-- Migration 003: Create report_assignments table
-- Tracks which employees are assigned to view which reports.

CREATE TABLE IF NOT EXISTS report_assignments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid        NOT NULL REFERENCES reports(id)  ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  assigned_by uuid        REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS ra_report_idx ON report_assignments (report_id);
CREATE INDEX IF NOT EXISTS ra_user_idx   ON report_assignments (user_id);
