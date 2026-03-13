import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class WatchMeetingDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  meetingId!: string;
}
