import { MeetingRole } from '@prisma/client';

export class MeetingMemberDto {
  id!: string;
  userId!: string;
  userName!: string;
  role!: MeetingRole;
  joinedAt!: Date;
}
