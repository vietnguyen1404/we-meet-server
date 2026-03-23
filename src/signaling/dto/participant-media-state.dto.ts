import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ParticipantMediaStateDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  meetingId!: string;

  @IsBoolean()
  video!: boolean;

  @IsBoolean()
  audio!: boolean;
}
