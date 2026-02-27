import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * CurrentUser Decorator
 *
 * Extracts the authenticated user from request.user (set by JwtStrategy).
 *
 * Usage:
 * - @CurrentUser() user: UserResponseDto          // Get full user object
 * - @CurrentUser('id') userId: string             // Get user.id only
 * - @CurrentUser('email') email: string           // Get user.email only
 * - @CurrentUser('role') role: UserRole           // Get user.role only
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserResponseDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: UserResponseDto }>();
    const user = request.user;

    // If no property specified, return full user object
    if (!data) {
      return user;
    }

    // Extract specific property
    return user?.[data];
  },
);
