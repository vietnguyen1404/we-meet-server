import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { GoogleProfile } from '../strategies/google.strategy';

/**
 * Google OAuth Authentication Guard
 *
 * For GET /auth/google: triggers the Passport redirect to Google.
 * For GET /auth/google/callback: validates the OAuth callback and attaches
 * the GoogleProfile to request.user.
 *
 * Handles the access_denied case (user cancels) gracefully with 401.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = GoogleProfile>(err: Error | null, user: GoogleProfile | false): TUser {
    if (err) {
      const msg = err.message?.toLowerCase() ?? '';
      if (msg.includes('access_denied') || msg.includes('access denied')) {
        throw new UnauthorizedException('Google authentication was cancelled by the user');
      }
      throw new UnauthorizedException('Google authentication failed');
    }
    if (!user) {
      throw new UnauthorizedException('Google authentication failed');
    }
    return user as unknown as TUser;
  }
}
