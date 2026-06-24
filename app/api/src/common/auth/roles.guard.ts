import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, UserRole } from "./roles.decorator";
import { JwtPayload } from "./current-user.decorator";

/**
 * RolesGuard — must be used AFTER JwtGuard (request.user must already be set).
 * Returns 403 when the authenticated user lacks a required role.
 * Returns 401 is handled upstream by JwtGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator — route is accessible by any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      // Should not happen if JwtGuard ran first, but guard defensively
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Access denied",
      });
    }

    const hasRole = requiredRoles.includes(user.role as UserRole);

    if (!hasRole) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Access denied — insufficient role",
      });
    }

    return true;
  }
}
