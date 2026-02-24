import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class RefreshTokenService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a cryptographically secure random token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash the refresh token using bcrypt
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, this.SALT_ROUNDS);
  }

  /**
   * Verify if the provided token matches the hash
   */
  async verifyToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  /**
   * Create and store a new refresh token
   */
  async createRefreshToken(userId: string): Promise<string> {
    const token = this.generateToken();
    const tokenHash = await this.hashToken(token);

    const expiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
    const expiresAt = this.calculateExpiryDate(expiresIn);

    await this.refreshTokenRepository.create({
      tokenHash,
      userId,
      expiresAt,
    });

    return token;
  }

  /**
   * Validate and retrieve refresh token from database
   */
  async validateRefreshToken(token: string): Promise<{ userId: string; tokenHash: string }> {
    // Hash the token to find it in the database
    const tokenHash = await this.hashToken(token);

    // Try to find the refresh token by hash
    const refreshToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > refreshToken.expiresAt) {
      await this.refreshTokenRepository.deleteByTokenHash(tokenHash);
      throw new UnauthorizedException('Refresh token expired');
    }

    return {
      userId: refreshToken.userId,
      tokenHash,
    };
  }

  /**
   * Rotate refresh token (delete old, create new)
   */
  async rotateRefreshToken(oldTokenHash: string, userId: string): Promise<string> {
    await this.refreshTokenRepository.deleteByTokenHash(oldTokenHash);
    return this.createRefreshToken(userId);
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const tokenHash = await this.hashToken(token);
      await this.refreshTokenRepository.deleteByTokenHash(tokenHash);
    } catch {
      // Silently fail if token doesn't exist
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteAllByUserId(userId);
  }

  /**
   * Calculate expiry date from string like '7d', '15m'
   */
  private calculateExpiryDate(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const [, amount, unit] = match;
    const now = new Date();
    const value = parseInt(amount, 10);

    switch (unit) {
      case 's':
        now.setSeconds(now.getSeconds() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'd':
        now.setDate(now.getDate() + value);
        break;
    }

    return now;
  }
}
