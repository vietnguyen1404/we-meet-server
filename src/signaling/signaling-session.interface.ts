import { User } from '@prisma/client';

export interface ParticipantInfo {
  socketId: string;
  userId: string;
  name: string;
  joinedAt: number;
}

export const SIGNALING_SESSION_SERVICE = Symbol('SIGNALING_SESSION_SERVICE');

export interface ISignalingSessionService {
  addParticipant(
    meetingId: string,
    socketId: string,
    user: Omit<User, 'passwordHash'>,
  ): ParticipantInfo;

  removeParticipant(meetingId: string, socketId: string): ParticipantInfo | undefined;

  getParticipants(meetingId: string): ParticipantInfo[];

  getSocketRooms(socketId: string): Set<string>;

  isParticipant(meetingId: string, socketId: string): boolean;
}
