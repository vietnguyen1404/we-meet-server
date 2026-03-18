import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  AddParticipantResult,
  ISignalingSessionService,
  ParticipantInfo,
} from './signaling-session.interface';

@Injectable()
export class SignalingSessionService implements ISignalingSessionService {
  private readonly rooms = new Map<string, Map<string, ParticipantInfo>>();
  private readonly socketToMeeting = new Map<string, string>();

  addParticipant(
    meetingId: string,
    socketId: string,
    user: Omit<User, 'passwordHash'>,
    isHost: boolean,
  ): AddParticipantResult {
    if (!this.rooms.has(meetingId)) {
      this.rooms.set(meetingId, new Map());
    }
    const room = this.rooms.get(meetingId)!;

    let evictedSocketId: string | undefined;
    for (const [existingSocketId, p] of room.entries()) {
      if (p.userId === user.id && existingSocketId !== socketId) {
        evictedSocketId = existingSocketId;
        room.delete(existingSocketId);
        this.socketToMeeting.delete(existingSocketId);
        break;
      }
    }

    const participant: ParticipantInfo = {
      socketId,
      userId: user.id,
      name: user.name ?? 'Anonymous',
      isHost,
      joinedAt: Date.now(),
    };
    room.set(socketId, participant);
    this.socketToMeeting.set(socketId, meetingId);
    return { participant, evictedSocketId };
  }

  removeParticipant(
    socketId: string,
  ): { meetingId: string; participant: ParticipantInfo } | undefined {
    const meetingId = this.socketToMeeting.get(socketId);
    if (!meetingId) return undefined;
    const room = this.rooms.get(meetingId);
    const participant = room?.get(socketId);
    if (!participant) return undefined;
    room!.delete(socketId);
    this.socketToMeeting.delete(socketId);
    if (room!.size === 0) this.rooms.delete(meetingId);
    return { meetingId, participant };
  }

  getParticipants(meetingId: string): ParticipantInfo[] {
    return Array.from(this.rooms.get(meetingId)?.values() ?? []);
  }

  getMeetingIdBySocket(socketId: string): string | undefined {
    return this.socketToMeeting.get(socketId);
  }

  isParticipant(meetingId: string, socketId: string): boolean {
    return this.rooms.get(meetingId)?.has(socketId) ?? false;
  }
}
