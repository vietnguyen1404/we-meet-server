import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { ISignalingSessionService, ParticipantInfo } from './signaling-session.interface';

@Injectable()
export class SignalingSessionService implements ISignalingSessionService {
  /** meetingId → (socketId → ParticipantInfo) */
  private readonly rooms = new Map<string, Map<string, ParticipantInfo>>();

  /** socketId → Set<meetingId> (reverse index for O(k) disconnect cleanup) */
  private readonly socketRooms = new Map<string, Set<string>>();

  addParticipant(
    meetingId: string,
    socketId: string,
    user: Omit<User, 'passwordHash'>,
  ): ParticipantInfo {
    if (!this.rooms.has(meetingId)) {
      this.rooms.set(meetingId, new Map());
    }

    const participant: ParticipantInfo = {
      socketId,
      userId: user.id,
      name: user.name ?? 'Anonymous',
      joinedAt: Date.now(),
    };

    this.rooms.get(meetingId)!.set(socketId, participant);

    // Maintain reverse index
    if (!this.socketRooms.has(socketId)) {
      this.socketRooms.set(socketId, new Set());
    }
    this.socketRooms.get(socketId)!.add(meetingId);

    return participant;
  }

  removeParticipant(meetingId: string, socketId: string): ParticipantInfo | undefined {
    const room = this.rooms.get(meetingId);
    if (!room) return undefined;

    const participant = room.get(socketId);
    if (!participant) return undefined;

    room.delete(socketId);

    // Last-participant lifecycle rule: destroy the session entry
    if (room.size === 0) {
      this.rooms.delete(meetingId);
    }

    // Update reverse index
    const socketMeetings = this.socketRooms.get(socketId);
    if (socketMeetings) {
      socketMeetings.delete(meetingId);
      if (socketMeetings.size === 0) {
        this.socketRooms.delete(socketId);
      }
    }

    return participant;
  }

  getParticipants(meetingId: string): ParticipantInfo[] {
    const room = this.rooms.get(meetingId);
    return room ? Array.from(room.values()) : [];
  }

  getSocketRooms(socketId: string): Set<string> {
    return this.socketRooms.get(socketId) ?? new Set();
  }

  isParticipant(meetingId: string, socketId: string): boolean {
    return this.rooms.get(meetingId)?.has(socketId) ?? false;
  }
}
