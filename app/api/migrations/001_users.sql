-- Migration 001: Create users table
-- Supports super_admin (CEO) and employee roles.
-- Soft-delete via deleted_at. Email lookup is case-insensitive via lower().

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text        NOT NULL,
  phone                text,
  email                text        NOT NULL,
  password_hash        text        NOT NULL,
  role                 text        NOT NULL CHECK (role IN ('super_admin', 'employee')),
  is_active            boolean     NOT NULL DEFAULT true,
  must_change_password boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

-- Unique constraint on lower(email) to enforce case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx
  ON users (lower(email))
  WHERE deleted_at IS NULL;

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));
