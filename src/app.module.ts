import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import authConfig from './config/auth.config';
import { envValidationSchema } from 'src/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      load: [authConfig],
      validationSchema: envValidationSchema,
    }),
  ],
})
export class AppModule {}
