import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { Request } from 'express';
import * as crypto from 'crypto';
import { DB_POOL } from '../db/db.module';

/**
 * PatGuard — validates a Personal Access Token passed as Bearer token.
 *
 * PATs are stored as SHA-256 hashes in personal_access_tokens table.
 * The plain token value is only shown once at creation time.
 * On each request we hash the incoming token and do a DB lookup.
 *
 * Sets request.user with the owning user's id + role so downstream
 * guards/decorators work the same way as with JwtGuard.
 */
@Injectable()
export class PatGuard implements CanActivate {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawToken = this.extractBearerToken(request);

    if (!rawToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization token',
      });
    }

    const tokenHash = this.hashToken(rawToken);

    const result = await this.pool.query<{
      user_id: string;
      role: string;
      revoked_at: Date | null;
    }>(
      `SELECT pat.user_id, u.role, pat.revoked_at
       FROM personal_access_tokens pat
       JOIN users u ON u.id = pat.user_id
       WHERE pat.token_hash = $1
         AND u.is_active = true
         AND u.deleted_at IS NULL`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or revoked personal access token',
      });
    }

    const row = result.rows[0];

    if (row.revoked_at !== null) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or revoked personal access token',
      });
    }

    // Update last_used_at asynchronously — don't await to avoid latency
    void this.pool.query(
      `UPDATE personal_access_tokens SET last_used_at = now() WHERE token_hash = $1`,
      [tokenHash],
    );

    // Attach user context same shape as JwtPayload
    request.user = {
      sub: row.user_id,
      role: row.role as 'super_admin' | 'employee',
      mustChangePassword: false,
    };

    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
