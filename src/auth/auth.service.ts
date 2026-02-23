import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT access token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = await this.refreshTokenService.createRefreshToken(user.id);

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

    // Generate new access token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

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
}
