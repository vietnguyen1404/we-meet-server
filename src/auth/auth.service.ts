import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { RefreshTokenService } from './refresh-token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { plainToInstance } from 'class-transformer';
import type { GoogleProfile } from './strategies/google.strategy';
import { AUTH_PROVIDERS } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    const { email, password, name } = registerDto;

    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    let passwordHash: string;
    try {
      passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch {
      throw new InternalServerErrorException('Failed to hash password');
    }

    const user = await this.usersRepository.create({
      email,
      passwordHash,
      name: name || null,
    });

    return plainToInstance(UserResponseDto, user);
  }

  async login(loginDto: LoginDto): Promise<{ response: AuthResponseDto; refreshToken: string }> {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateAuthTokens(user);

    return {
      response: {
        user: plainToInstance(UserResponseDto, user),
        accessToken,
      },
      refreshToken,
    };
  }

  async googleLogin(
    profile: GoogleProfile,
  ): Promise<{ response: AuthResponseDto; refreshToken: string }> {
    let user = await this.usersRepository.findByProviderId(profile.providerId);

    if (user) {
      // Returning Google user — backfill avatar if not yet set
      if (!user.avatar && profile.picture) {
        user = await this.usersRepository.update(user.id, { avatar: profile.picture });
      }
    } else {
      const byEmail = await this.usersRepository.findByEmail(profile.email);
      if (byEmail) {
        if (byEmail.provider === AUTH_PROVIDERS.LOCAL) {
          throw new ConflictException(
            'An account with this email already exists. Please log in with your password.',
          );
        }
        // Existing Google user found by email — backfill avatar if not yet set
        if (!byEmail.avatar && profile.picture) {
          user = await this.usersRepository.update(byEmail.id, { avatar: profile.picture });
        } else {
          user = byEmail;
        }
      } else {
        user = await this.usersRepository.createOAuthUser({
          email: profile.email,
          name: profile.name,
          avatar: profile.picture,
          providerId: profile.providerId,
          provider: AUTH_PROVIDERS.GOOGLE,
        });
      }
    }

    const { accessToken, refreshToken } = await this.generateAuthTokens(user);

    return {
      response: {
        user: plainToInstance(UserResponseDto, user),
        accessToken,
      },
      refreshToken,
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ response: RefreshTokenDto; newRefreshToken: string }> {
    // Validate the refresh token
    const { userId, tokenHash } = await this.refreshTokenService.validateRefreshToken(refreshToken);

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.jwtService.sign(this.buildPayload(user));

    // Rotate refresh token
    const newRefreshToken = await this.refreshTokenService.rotateRefreshToken(tokenHash, userId);

    return {
      response: { accessToken },
      newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenService.revokeRefreshToken(refreshToken);
  }

  async validateUser(payload: JwtPayload): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return plainToInstance(UserResponseDto, user);
  }

  private buildPayload(user: User): JwtPayload {
    return { userId: user.id, email: user.email, role: user.role };
  }

  private async generateAuthTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!user?.id) {
      throw new BadRequestException('Invalid user object provided');
    }

    try {
      const [accessToken, refreshToken] = await Promise.all([
        Promise.resolve(this.jwtService.sign(this.buildPayload(user))),
        this.refreshTokenService.createRefreshToken(user.id),
      ]);

      return { accessToken, refreshToken };
    } catch {
      throw new InternalServerErrorException('Failed to issue authentication tokens');
    }
  }
}
