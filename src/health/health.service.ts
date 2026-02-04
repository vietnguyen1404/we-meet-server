import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const startTime = Date.now();
    const dbHealthy = await this.prisma.healthCheck();
    const responseTime = Date.now() - startTime;

    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbHealthy ? 'up' : 'down',
          responseTime: `${responseTime}ms`,
        },
      },
    };
  }
}
