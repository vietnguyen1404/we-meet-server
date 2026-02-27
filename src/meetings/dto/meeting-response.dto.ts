import { MeetingMemberDto } from './meeting-member.dto';

export class MeetingResponseDto {
  id!: string;
  title!: string;
  hostId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  members?: MeetingMemberDto[];
}
