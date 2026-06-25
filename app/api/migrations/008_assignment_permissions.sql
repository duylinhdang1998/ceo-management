-- Migration 008: Add per-user permission flags to report_assignments
-- Tracks whether each employee can edit or download a specific report.

ALTER TABLE report_assignments
  ADD COLUMN IF NOT EXISTS can_edit     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_download boolean NOT NULL DEFAULT false;
