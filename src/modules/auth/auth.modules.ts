import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthConfigService {
  constructor(private readonly configService: ConfigService) {}

  get accessTokenSecret() {
    return this.configService.get<string>('JWT_ACCESS_SECRET');
  }

  get accessTokenExpiresIn() {
    return this.configService.get<string>('JWT_ACCESS_EXPIRES_IN');
  }
}
