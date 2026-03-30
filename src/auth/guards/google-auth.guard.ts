import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
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
    // Detect user-cancelled flow before Passport processes the callback.
    const request = context.switchToHttp().getRequest<Request>();
    if (request.query['error'] === 'access_denied') {
      throw new UnauthorizedException('Google authentication was cancelled by the user');
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = GoogleProfile>(
    err: Error | null,
    user: GoogleProfile | false,
    info: unknown,
  ): TUser {
    if (err) {
      const infoMsg = GoogleAuthGuard.extractInfoMessage(info);
      if (
        infoMsg.includes('access_denied') ||
        infoMsg.includes('access denied') ||
        err.message?.toLowerCase().includes('access_denied')
      ) {
        throw new UnauthorizedException('Google authentication was cancelled by the user');
      }
      throw new UnauthorizedException('Google authentication failed');
    }
    if (!user) {
      throw new UnauthorizedException('Google authentication failed');
    }
    return user as unknown as TUser;
  }

  private static extractInfoMessage(info: unknown): string {
    if (typeof info === 'string') return info.toLowerCase();
    if (info instanceof Error) return info.message.toLowerCase();
    return '';
  }
}
