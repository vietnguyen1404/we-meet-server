import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type { IceServerDto } from './dto/ice-servers-response.dto';

@Injectable()
export class IceConfigService {
  private readonly logger = new Logger(IceConfigService.name);

  private readonly stunUrls: string[];
  private readonly turnUrls: string[];
  private readonly turnSecret: string | undefined;
  private readonly turnUsername: string | undefined;
  private readonly turnPassword: string | undefined;
  private readonly ttlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    const stunRaw = this.configService.get<string>('STUN_URLS');
    this.stunUrls = stunRaw
      ? stunRaw
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean)
      : ['stun:stun.l.google.com:19302'];

    const turnRaw = this.configService.get<string>('TURN_URLS');
    this.turnUrls = turnRaw
      ? turnRaw
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean)
      : [];

    this.turnSecret = this.configService.get<string>('TURN_SECRET');
    this.turnUsername = this.configService.get<string>('TURN_USERNAME');
    this.turnPassword = this.configService.get<string>('TURN_PASSWORD');
    this.ttlSeconds = this.configService.get<number>('TURN_CREDENTIAL_TTL_SECONDS') ?? 3600;

    if (this.turnUrls.length === 0) {
      this.logger.warn('No TURN_URLS configured — clients will rely on STUN or direct P2P only.');
    }
  }

  getIceServers(userId: string): IceServerDto[] {
    const servers: IceServerDto[] = this.stunUrls.map((urls) => ({ urls }));

    if (this.turnUrls.length === 0) {
      return servers;
    }

    if (this.turnSecret) {
      const expiry = Math.floor(Date.now() / 1000) + this.ttlSeconds;
      const username = `${expiry}:${userId}`;
      const credential = createHmac('sha1', this.turnSecret).update(username).digest('base64');
      for (const urls of this.turnUrls) {
        servers.push({ urls, username, credential });
      }
    } else if (this.turnUsername && this.turnPassword) {
      for (const urls of this.turnUrls) {
        servers.push({ urls, username: this.turnUsername, credential: this.turnPassword });
      }
    }

    return servers;
  }
}
