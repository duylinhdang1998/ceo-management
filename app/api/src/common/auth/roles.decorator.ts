import { SetMetadata } from '@nestjs/common';

export type UserRole = 'super_admin' | 'employee';

export const ROLES_KEY = 'roles';

/**
 * @Roles('super_admin') — attach required roles to a route/controller.
 * Consumed by RolesGuard.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
