import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { GoogleProfile } from './strategies/google.strategy';

@Controller('auth')
export class AuthController {
  private readonly REFRESH_TOKEN_COOKIE = 'refreshToken';
  private readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { response, refreshToken } = await this.authService.login(loginDto);

    // Set refresh token in HttpOnly cookie
    res.cookie(this.REFRESH_TOKEN_COOKIE, refreshToken, this.COOKIE_OPTIONS);

    return response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshTokenDto> {
    const refreshToken = req.cookies[this.REFRESH_TOKEN_COOKIE] as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const { response, newRefreshToken } = await this.authService.refresh(refreshToken);

    // Set new refresh token in HttpOnly cookie
    res.cookie(this.REFRESH_TOKEN_COOKIE, newRefreshToken, this.COOKIE_OPTIONS);

    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const refreshToken = req.cookies[this.REFRESH_TOKEN_COOKIE] as string | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie(this.REFRESH_TOKEN_COOKIE, this.COOKIE_OPTIONS);

    return { message: 'Logged out successfully' };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
    // Passport redirects the request to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request & { user: GoogleProfile },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { response, refreshToken } = await this.authService.googleLogin(req.user);
    res.cookie(this.REFRESH_TOKEN_COOKIE, refreshToken, this.COOKIE_OPTIONS);
    return response;
  }
}
