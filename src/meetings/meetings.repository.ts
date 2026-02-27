import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Meeting, MeetingRole, Prisma } from '@prisma/client';

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.MeetingCreateInput): Promise<Meeting> {
    return this.prisma.meeting.create({
      data,
    });
  }

  async findById(id: string, include?: Prisma.MeetingInclude): Promise<Meeting | null> {
    return this.prisma.meeting.findUnique({
      where: { id },
      include,
    });
  }

  async createMembershipWithinTransaction(
    tx: Prisma.TransactionClient,
    meetingId: string,
    userId: string,
    role: MeetingRole,
  ) {
    return tx.meetingMember.create({
      data: {
        meetingId,
        userId,
        role,
      },
    });
  }

  async findMemberByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.meetingMember.findFirst({
      where: {
        AND: [{ meetingId }, { userId }],
      },
      select: { id: true },
    });
  }
}
