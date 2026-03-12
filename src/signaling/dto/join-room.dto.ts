import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  meetingId!: string;
}
