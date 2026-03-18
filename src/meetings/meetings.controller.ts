import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMeeting(
    @CurrentUser('id') userId: string,
    @Body() createMeetingDto: CreateMeetingDto,
  ): Promise<MeetingResponseDto> {
    return this.meetingsService.createMeeting(userId, createMeetingDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getMeetingDetails(@Param('id') meetingId: string): Promise<MeetingResponseDto> {
    return this.meetingsService.getMeetingDetails(meetingId);
  }
}
