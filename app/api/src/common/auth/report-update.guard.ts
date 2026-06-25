import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Pool } from "pg";
import * as crypto from "crypto";
import { Request } from "express";
import { DB_POOL } from "../db/db.module";
import { JwtPayload } from "./current-user.decorator";

/**
 * ReportUpdateGuard — grants access to PUT /api/reports/:id if:
 *   (a) Bearer token is a valid, non-revoked PAT belonging to a super_admin, OR
 *   (b) Bearer token is a valid JWT for ANY authenticated user (super_admin OR employee).
 *       Service layer enforces the finer-grained can_edit check for employees.
 *
 * This is a clone of JwtOrPatWriteGuard but the JWT branch admits all roles
 * (not just super_admin), so employees with can_edit can reach the update handler.
 *
 * PAT branch stays super_admin-only (unchanged from JwtOrPatWriteGuard).
 */
@Injectable()
export class ReportUpdateGuard implements CanActivate {
  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const raw = this.extractBearer(req);

    if (!raw) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization token",
      });
    }

    // --- Try PAT first (super_admin-only, identical to JwtOrPatWriteGuard) ---
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    const patResult = await this.pool.query<{
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

    if (patResult.rows.length > 0) {
      const row = patResult.rows[0];
      if (row.revoked_at !== null) {
        throw new UnauthorizedException({
          code: "UNAUTHORIZED",
          message: "Invalid or revoked personal access token",
        });
      }
      if (row.role !== "super_admin") {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Access denied — insufficient role",
        });
      }
      // Update last_used_at asynchronously — fire-and-forget
      void this.pool.query(
        `UPDATE personal_access_tokens SET last_used_at = now() WHERE token_hash = $1`,
        [tokenHash],
      );
      req.user = {
        sub: row.user_id,
        role: "super_admin",
        mustChangePassword: false,
      };
      return true;
    }

    // --- Fallback: JWT — admit any authenticated user (super_admin OR employee) ---
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(raw, {
        secret: process.env.JWT_SECRET,
      });
      // Attach user; service will enforce can_edit for employees
      req.user = payload;
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization token",
      });
    }
  }

  private extractBearer(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
