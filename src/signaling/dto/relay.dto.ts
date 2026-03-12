import { IsDefined, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RelayDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  targetSocketId!: string;

  @IsDefined()
  payload!: unknown;
}
