import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { SignalingSessionService } from './signaling-session.service';
import { SignalingRateLimiterService } from './signaling-rate-limiter.service';
import { SIGNALING_SESSION_SERVICE } from './signaling-session.interface';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { IceConfigModule } from '../ice-config/ice-config.module';

@Module({
  imports: [AuthModule, UsersModule, MeetingsModule, IceConfigModule],
  providers: [
    SignalingGateway,
    SignalingRateLimiterService,
    {
      provide: SIGNALING_SESSION_SERVICE,
      useClass: SignalingSessionService,
    },
  ],
})
export class SignalingModule {}
