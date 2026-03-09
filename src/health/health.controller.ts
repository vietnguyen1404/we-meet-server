import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  root() {
    return { status: 'ok' };
  }

  @Get('health')
  async check() {
    return this.healthService.check();
  }
}
