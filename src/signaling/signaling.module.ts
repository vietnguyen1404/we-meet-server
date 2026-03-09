import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [SignalingGateway],
})
export class SignalingModule {}
