import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Meeting, Prisma } from '@prisma/client';

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
}
