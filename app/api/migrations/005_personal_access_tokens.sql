-- Migration 005: Personal Access Tokens (PAT) for Claude Skill integration
-- Only the SHA-256 hash is stored. The raw token is shown exactly once at creation.

CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id),
  name         text        NOT NULL,
  token_hash   text        NOT NULL UNIQUE,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

CREATE INDEX IF NOT EXISTS pat_user_idx       ON personal_access_tokens (user_id);
CREATE INDEX IF NOT EXISTS pat_token_hash_idx ON personal_access_tokens (token_hash);
