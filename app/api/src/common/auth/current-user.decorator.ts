import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface JwtPayload {
  sub: string;
  role: "super_admin" | "employee";
  mustChangePassword: boolean;
  iat?: number;
  exp?: number;
}

/**
 * @CurrentUser() — extracts the decoded JWT payload injected by JwtGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);
