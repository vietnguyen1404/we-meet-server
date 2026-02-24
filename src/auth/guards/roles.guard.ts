import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Roles Guard
 *
 * Implements role-based access control (RBAC).
 * Must be used AFTER JwtAuthGuard to ensure request.user is populated.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * @Delete(':id')
 * deleteUser(@Param('id') id: string) { ... }
 *
 * Responsibilities:
 * - Read required roles from @Roles() decorator metadata
 * - Compare against authenticated user's role
 * - Return 403 Forbidden if role doesn't match
 * - Allow access if no roles specified (public after auth)
 *
 * Security considerations:
 * - Always use with JwtAuthGuard
 * - JwtAuthGuard must come first in guards array
 * - User role comes from database via JwtStrategy (trusted)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow access (route is public after authentication)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get authenticated user from request (populated by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<{ user: UserResponseDto }>();
    const user = request.user;

    // This should never happen if JwtAuthGuard is used correctly
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user's role matches any of the required roles
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
