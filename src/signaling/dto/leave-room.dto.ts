import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class LeaveRoomDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  meetingId!: string;
}
