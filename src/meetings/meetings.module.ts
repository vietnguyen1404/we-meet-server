import { Module } from '@nestjs/common';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { MeetingsRepository } from './meetings.repository';
import { PrismaModule } from '../database/prisma.module';
import { IceConfigModule } from '../ice-config/ice-config.module';

@Module({
  imports: [PrismaModule, IceConfigModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsRepository],
  exports: [MeetingsService, MeetingsRepository],
})
export class MeetingsModule {}
