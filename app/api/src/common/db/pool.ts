import { Pool } from "pg";

/**
 * Singleton pg Pool instance.
 * Reads DATABASE_URL from env.
 * All queries go through parameterized SQL — no ORM.
 */
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on("error", (err) => {
      console.error("[pg Pool] Unexpected error on idle client", err);
    });
  }
  return pool;
}

/** For test teardown: gracefully end the pool */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
