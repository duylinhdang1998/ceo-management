import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { DB_POOL } from '../../common/db/db.module';
import { CreatePatDto } from './dto/create-pat.dto';

export interface PatRow {
  id: string;
  name: string;
  last_used_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

export interface PatPublic {
  id: string;
  name: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

function toPatPublic(row: PatRow): PatPublic {
  return {
    id: row.id,
    name: row.name,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

@Injectable()
export class PatService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  /**
   * Generate a new PAT. Returns the plain token ONCE — only the hash is stored.
   */
  async create(
    userId: string,
    dto: CreatePatDto,
  ): Promise<{ id: string; name: string; token: string; createdAt: Date }> {
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64-char hex
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const result = await this.pool.query<{ id: string; created_at: Date }>(
      `INSERT INTO personal_access_tokens (user_id, name, token_hash)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [userId, dto.name, tokenHash],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      name: dto.name,
      token: rawToken, // shown once
      createdAt: row.created_at,
    };
  }

  /** List all PATs for a user (no token hashes returned), camelCase for the FE. */
  async list(userId: string): Promise<PatPublic[]> {
    const result = await this.pool.query<PatRow>(
      `SELECT id, name, last_used_at, created_at, revoked_at
       FROM personal_access_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map(toPatPublic);
  }

  /** Revoke a PAT by id. Only the owning user (super_admin) may revoke. */
  async revoke(userId: string, patId: string): Promise<{ message: string }> {
    const result = await this.pool.query<{ user_id: string; revoked_at: Date | null }>(
      `SELECT user_id, revoked_at FROM personal_access_tokens WHERE id = $1`,
      [patId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Token không tồn tại',
      });
    }

    const pat = result.rows[0];

    if (pat.user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thu hồi token này',
      });
    }

    await this.pool.query(
      `UPDATE personal_access_tokens SET revoked_at = now() WHERE id = $1`,
      [patId],
    );

    return { message: 'Token đã được thu hồi' };
  }
}
