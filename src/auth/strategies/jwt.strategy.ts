import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from '../../users/users.repository';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { plainToInstance } from 'class-transformer';

/**
 * JWT Strategy for Passport authentication
 *
 * Responsibilities:
 * - Extract JWT from Authorization header (Bearer token)
 * - Verify token signature using ACCESS_TOKEN_SECRET
 * - Validate that the user exists in database
 * - Attach sanitized user object to request.user
 *
 * Security considerations:
 * - Never trust decoded token without database validation
 * - Password hash is excluded via UserResponseDto
 * - Throws UnauthorizedException if user is deleted/not found
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersRepository: UsersRepository,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ACCESS_TOKEN_SECRET')!,
    });
  }

  /**
   * Validate JWT payload and ensure user exists
   * Called automatically by Passport after token verification
   *
   * @param payload - Decoded JWT payload
   * @returns Safe user object (without password)
   * @throws UnauthorizedException if user not found or inactive
   */
  async validate(payload: JwtPayload): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Transform user entity to response DTO to exclude sensitive fields
    return plainToInstance(UserResponseDto, user);
  }
}
