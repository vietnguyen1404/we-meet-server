import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MeetingsRepository } from './meetings.repository';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { MeetingMemberDto } from './dto/meeting-member.dto';
import { MeetingRole } from '@prisma/client';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meetingsRepository: MeetingsRepository,
  ) {}

  async createMeeting(
    userId: string,
    createMeetingDto: CreateMeetingDto,
  ): Promise<MeetingResponseDto> {
    const { title } = createMeetingDto;

    // Use transaction to ensure atomicity: create meeting + add host as member
    const result = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: {
          title: title || 'Untitled Meeting',
          hostId: userId,
        },
      });

      await this.meetingsRepository.createMembershipWithinTransaction(
        tx,
        meeting.id,
        userId,
        MeetingRole.HOST,
      );

      return meeting;
    });

    return {
      id: result.id,
      title: result.title || 'Untitled Meeting',
      hostId: result.hostId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async joinMeeting(userId: string, meetingId: string): Promise<MeetingResponseDto> {
    // Check if meeting exists
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    // Check if user is already a member
    const existingMember = await this.meetingsRepository.findMemberByMeetingAndUser(
      meetingId,
      userId,
    );

    if (existingMember) {
      throw new ConflictException('You are already a member of this meeting');
    }

    // Add user as participant
    await this.prisma.meetingMember.create({
      data: {
        meetingId,
        userId,
        role: MeetingRole.PARTICIPANT,
      },
    });

    return this.getMeetingDetails(meetingId);
  }

  async getMeetingDetails(meetingId: string): Promise<MeetingResponseDto> {
    const meeting = await this.meetingsRepository.findById(meetingId, {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    // Type assertion since Prisma types can be complex with includes
    const meetingWithMembers = meeting as typeof meeting & {
      members: Array<{
        id: string;
        userId: string;
        role: MeetingRole;
        joinedAt: Date;
        user: { id: string; name: string };
      }>;
    };

    const members: MeetingMemberDto[] =
      meetingWithMembers.members?.map((member) => ({
        id: member.id,
        userId: member.userId,
        userName: member.user.name,
        role: member.role,
        joinedAt: member.joinedAt,
      })) || [];

    return {
      id: meeting.id,
      title: meeting.title || 'Untitled Meeting',
      hostId: meeting.hostId,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
      members,
    };
  }
}
