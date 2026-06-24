-- Migration 006: Email audit log
-- Records every email send attempt (success or failure).

CREATE TABLE IF NOT EXISTS email_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id         uuid        REFERENCES users(id),
  recipient_user_id uuid        REFERENCES users(id),
  recipient_email   text        NOT NULL,
  subject           text,
  body              text,
  report_id         uuid        REFERENCES reports(id),
  attachments_count int         NOT NULL DEFAULT 0,
  status            text        NOT NULL CHECK (status IN ('success', 'failed')),
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_sender_idx  ON email_logs (sender_id);
CREATE INDEX IF NOT EXISTS email_logs_created_idx ON email_logs (created_at DESC);
