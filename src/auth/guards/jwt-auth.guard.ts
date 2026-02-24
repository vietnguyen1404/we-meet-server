import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * JWT Authentication Guard
 *
 * Protects routes by validating JWT access tokens.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: UserResponseDto) { ... }
 *
 * Responsibilities:
 * - Validates Bearer token from Authorization header
 * - Delegates to JwtStrategy for user validation
 * - Attaches user to request.user on success
 * - Returns 401 Unauthorized if token missing/invalid/expired
 *
 * This guard is thin by design - all business logic is in JwtStrategy
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Delegate to Passport's AuthGuard which uses JwtStrategy
    return super.canActivate(context);
  }

  handleRequest<TUser = UserResponseDto>(
    err: Error | null,
    user: UserResponseDto | false,
    info: { name?: string } | undefined,
  ): TUser {
    // Handle authentication errors with clear messages
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token has expired');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid access token');
      }
      throw err || new UnauthorizedException('Authentication required');
    }
    return user as TUser;
  }
}
