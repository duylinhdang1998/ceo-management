-- Migration 002: Create reports table
-- HTML content stored on CMC S3; only the s3_key is kept here.

CREATE TABLE IF NOT EXISTS reports (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published')),
  s3_key      text,
  size_bytes  int,
  created_by  uuid        REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- Index for title-based search (ILIKE queries)
CREATE INDEX IF NOT EXISTS reports_title_idx    ON reports (title);
CREATE INDEX IF NOT EXISTS reports_deleted_idx  ON reports (deleted_at);
CREATE INDEX IF NOT EXISTS reports_status_idx   ON reports (status) WHERE deleted_at IS NULL;
