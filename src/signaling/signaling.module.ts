import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MeetingsModule } from '../meetings/meetings.module';

@Module({
  imports: [AuthModule, UsersModule, MeetingsModule],
  providers: [SignalingGateway],
})
export class SignalingModule {}
