import { Module } from '@nestjs/common';
import { IceConfigService } from './ice-config.service';

@Module({
  providers: [IceConfigService],
  exports: [IceConfigService],
})
export class IceConfigModule {}
