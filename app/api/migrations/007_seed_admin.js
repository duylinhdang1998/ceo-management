/**
 * Migration 007: Seed super-admin (CEO)
 *
 * Reads SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from environment.
 * Uses bcrypt (12 rounds) to hash the password.
 * Idempotent: skips if the email already exists.
 *
 * node-pg-migrate JS migration format.
 */

const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = async (pgm) => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      '[seed] SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set — skipping seed',
    );
    return;
  }

  // Check idempotency
  const existing = await pgm.db.query(
    `SELECT id FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
    [email],
  );

  if (existing.rows.length > 0) {
    console.log(`[seed] Super-admin ${email} already exists — skipping`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await pgm.db.query(
    `INSERT INTO users (name, email, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, 'super_admin', false)`,
    ['CEO', email.toLowerCase(), passwordHash],
  );

  console.log(`[seed] Super-admin seeded: ${email}`);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = async (pgm) => {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (email) {
    await pgm.db.query(
      `DELETE FROM users WHERE lower(email) = lower($1) AND role = 'super_admin'`,
      [email],
    );
    console.log(`[seed] Super-admin ${email} removed`);
  }
};
