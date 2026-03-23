import type { User } from '@prisma/client';

export interface ParticipantInfo {
  socketId: string;
  userId: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export interface AddParticipantResult {
  participant: ParticipantInfo;
  evictedSocketId?: string;
}

export const SIGNALING_SESSION_SERVICE = Symbol('SIGNALING_SESSION_SERVICE');

export interface ISignalingSessionService {
  addParticipant(
    meetingId: string,
    socketId: string,
    user: Omit<User, 'passwordHash'>,
    isHost: boolean,
  ): AddParticipantResult;
  removeParticipant(
    socketId: string,
  ): { meetingId: string; participant: ParticipantInfo } | undefined;
  getParticipants(meetingId: string): ParticipantInfo[];
  getMeetingIdBySocket(socketId: string): string | undefined;
  isParticipant(meetingId: string, socketId: string): boolean;
  updateMediaState(
    socketId: string,
    video: boolean,
    audio: boolean,
  ): { meetingId: string; participant: ParticipantInfo } | undefined;
}
