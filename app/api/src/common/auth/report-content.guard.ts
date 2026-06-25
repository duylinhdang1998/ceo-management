import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { JwtPayload } from "./current-user.decorator";

interface ViewTokenPayload {
  sub: string;
  role: "super_admin" | "employee";
  reportId: string;
  purpose: string;
  iat?: number;
  exp?: number;
}

/**
 * ReportContentGuard — authenticates the GET /api/reports/:id/content endpoint
 * via EITHER:
 *   (a) `?token=<view-token>` query param — verifies JWT, requires purpose='report-view'
 *       and reportId matches :id route param; or
 *   (b) `Authorization: Bearer <JWT>` header — standard JWT verification.
 *
 * On success, sets req.user so @CurrentUser() works downstream.
 */
@Injectable()
export class ReportContentGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const reportId = req.params["id"];

    // --- Branch (a): query-param view-token ---
    const queryToken = req.query["token"] as string | undefined;
    if (queryToken) {
      let payload: ViewTokenPayload;
      try {
        payload = await this.jwtService.verifyAsync<ViewTokenPayload>(
          queryToken,
          { secret: process.env.JWT_SECRET },
        );
      } catch {
        throw new UnauthorizedException({
          code: "UNAUTHORIZED",
          message: "Token xem báo cáo không hợp lệ hoặc đã hết hạn",
        });
      }

      if (payload.purpose !== "report-view") {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Token không hợp lệ cho thao tác này",
        });
      }

      if (payload.reportId !== reportId) {
        throw new ForbiddenException({
          code: "FORBIDDEN",
          message: "Token không hợp lệ cho báo cáo này",
        });
      }

      req.user = {
        sub: payload.sub,
        role: payload.role,
        mustChangePassword: false,
      } satisfies JwtPayload;
      return true;
    }

    // --- Branch (b): Authorization header JWT ---
    const bearer = this.extractBearer(req);
    if (!bearer) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization token",
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(bearer, {
        secret: process.env.JWT_SECRET,
      });
      req.user = payload;
      return true;
    } catch {
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
