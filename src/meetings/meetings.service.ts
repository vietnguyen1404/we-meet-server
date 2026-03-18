import { Injectable, NotFoundException } from '@nestjs/common';
import { MeetingsRepository } from './meetings.repository';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';

@Injectable()
export class MeetingsService {
  constructor(private readonly meetingsRepository: MeetingsRepository) {}

  async createMeeting(
    userId: string,
    createMeetingDto: CreateMeetingDto,
  ): Promise<MeetingResponseDto> {
    const { title } = createMeetingDto;

    const meeting = await this.meetingsRepository.create({
      title: title || 'Untitled Meeting',
      host: { connect: { id: userId } },
    });

    return {
      id: meeting.id,
      title: meeting.title || 'Untitled Meeting',
      hostId: meeting.hostId,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }

  async getMeetingDetails(meetingId: string): Promise<MeetingResponseDto> {
    const meeting = await this.meetingsRepository.findById(meetingId);

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    return {
      id: meeting.id,
      title: meeting.title || 'Untitled Meeting',
      hostId: meeting.hostId,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }
}
