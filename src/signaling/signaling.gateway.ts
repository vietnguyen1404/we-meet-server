import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { User } from '@prisma/client';
import { UsersRepository } from '../users/users.repository';
import { MeetingsRepository } from '../meetings/meetings.repository';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

export interface ParticipantInfo {
  socketId: string;
  userId: string;
  name: string;
  joinedAt: number;
}

interface WatchMeetingPayload {
  meetingId: string;
}

interface JoinRoomPayload {
  meetingId: string;
}

interface LeaveRoomPayload {
  meetingId: string;
}

interface SignalingRelayPayload {
  meetingId: string;
  targetSocketId: string;
  payload: unknown;
}

interface SignalingRelayServerPayload {
  fromSocketId: string;
  payload: unknown;
}

interface ServerToClientEvents {
  error: (data: { code: number; message: string }) => void;
  'participant-joined': (data: { meetingId: string; participant: ParticipantInfo }) => void;
  'participant-left': (data: { meetingId: string; participant: ParticipantInfo }) => void;
  'participants-list': (data: { meetingId: string; participants: ParticipantInfo[] }) => void;
  offer: (data: SignalingRelayServerPayload) => void;
  answer: (data: SignalingRelayServerPayload) => void;
  'ice-candidate': (data: SignalingRelayServerPayload) => void;
}

interface ClientToServerEvents {
  'watch-meeting': (payload: WatchMeetingPayload) => void;
  'join-room': (payload: JoinRoomPayload) => void;
  'leave-room': (payload: LeaveRoomPayload) => void;
  offer: (payload: SignalingRelayPayload) => void;
  answer: (payload: SignalingRelayPayload) => void;
  'ice-candidate': (payload: SignalingRelayPayload) => void;
}

interface SocketData {
  user?: Omit<User, 'passwordHash'>;
}

type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SignalingGateway.name);

  /** meetingId → (socketId → ParticipantInfo) */
  private readonly rooms = new Map<string, Map<string, ParticipantInfo>>();

  /** socketId → Set<meetingId> (reverse index for O(k) disconnect cleanup) */
  private readonly socketRooms = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
    private readonly meetingsRepository: MeetingsRepository,
  ) {}

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(socket);

      if (!token) {
        throw new UnauthorizedException('Missing authentication token');
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.usersRepository.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const { passwordHash: _pw, ...safeUser } = user;
      socket.data.user = safeUser;
      this.logger.log(`Client connected: socketId=${socket.id} userId=${user.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      this.logger.warn(`Connection rejected: socketId=${socket.id} reason=${message}`);
      socket.emit('error', { code: 401, message });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    const userId: string | undefined = socket.data.user?.id;
    this.logger.log(
      `Client disconnected: socketId=${socket.id} userId=${userId ?? 'unauthenticated'}`,
    );

    // Clean up presence for every room this socket was in
    this.cleanupSocket(socket);
  }

  @SubscribeMessage('watch-meeting')
  async handleWatchMeeting(
    @MessageBody() payload: WatchMeetingPayload,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): Promise<void> {
    if (!socket.data.user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    if (!payload?.meetingId || typeof payload.meetingId !== 'string') {
      socket.emit('error', { code: 400, message: 'meetingId is required' });
      return;
    }

    const { meetingId } = payload;

    // Validate meeting exists
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      socket.emit('error', { code: 404, message: `Meeting ${meetingId} not found` });
      return;
    }

    const watchRoom = `watch:${meetingId}`;
    await socket.join(watchRoom);
    this.logger.log(`Watcher joined lobby: meetingId=${meetingId} socketId=${socket.id}`);

    // Send the current participant list to the watcher
    socket.emit('participants-list', {
      meetingId,
      participants: this.getParticipants(meetingId),
    });
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): Promise<void> {
    const user = socket.data.user;
    if (!user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    if (!payload?.meetingId || typeof payload.meetingId !== 'string') {
      socket.emit('error', { code: 400, message: 'meetingId is required' });
      return;
    }

    const { meetingId } = payload;

    // Validate meeting exists
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      socket.emit('error', { code: 404, message: `Meeting ${meetingId} not found` });
      return;
    }

    // Validate user is a DB member of the meeting
    const membership = await this.meetingsRepository.findMemberByMeetingAndUser(meetingId, user.id);
    if (!membership) {
      socket.emit('error', { code: 403, message: 'Not a member of this meeting' });
      return;
    }

    // No-op if already present in the room (prevents duplicate participant-joined events)
    if (this.rooms.get(meetingId)?.has(socket.id)) return;

    // Join the video-call Socket.IO room and record presence
    await socket.join(meetingId);
    const participant = this.addToRoom(meetingId, socket.id, user);

    this.logger.log(
      `User joined room: meetingId=${meetingId} socketId=${socket.id} userId=${user.id}`,
    );

    // Broadcast participant-joined to video-call participants and lobby watchers
    // socket.to() excludes the sender; emit to the union of both rooms
    socket.to(meetingId).to(`watch:${meetingId}`).emit('participant-joined', {
      meetingId,
      participant,
    });

    // Send the current participant list to the joining socket
    socket.emit('participants-list', {
      meetingId,
      participants: this.getParticipants(meetingId),
    });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() payload: LeaveRoomPayload,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): void {
    const user = socket.data.user;
    if (!user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    if (!payload?.meetingId || typeof payload.meetingId !== 'string') {
      socket.emit('error', { code: 400, message: 'meetingId is required' });
      return;
    }

    const { meetingId } = payload;
    this.removeFromRoomAndBroadcast(meetingId, socket);
  }

  @SubscribeMessage('offer')
  handleOffer(
    @MessageBody() payload: SignalingRelayPayload,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): void {
    this.handleSignalingRelay('offer', payload, socket);
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @MessageBody() payload: SignalingRelayPayload,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): void {
    this.handleSignalingRelay('answer', payload, socket);
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() payload: SignalingRelayPayload,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): void {
    this.handleSignalingRelay('ice-candidate', payload, socket);
  }

  private handleSignalingRelay(
    event: 'offer' | 'answer' | 'ice-candidate',
    payload: SignalingRelayPayload,
    socket: AuthenticatedSocket,
  ): void {
    if (!socket.data.user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    if (
      !payload?.meetingId ||
      typeof payload.meetingId !== 'string' ||
      !payload?.targetSocketId ||
      typeof payload.targetSocketId !== 'string'
    ) {
      socket.emit('error', { code: 400, message: 'meetingId and targetSocketId are required' });
      return;
    }

    const { meetingId, targetSocketId } = payload;

    if (!this.rooms.get(meetingId)?.has(socket.id)) {
      socket.emit('error', { code: 403, message: 'You are not in this room' });
      return;
    }

    if (!this.rooms.get(meetingId)?.has(targetSocketId)) {
      socket.emit('error', { code: 404, message: 'Target socket is not in this room' });
      return;
    }

    this.logger.log(
      `WebRTC relay: event=${event} meetingId=${meetingId} from=${socket.id} to=${targetSocketId}`,
    );

    this.server
      .to(targetSocketId)
      .emit(event, { fromSocketId: socket.id, payload: payload.payload });
  }

  private addToRoom(
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

    // Maintain the reverse index
    if (!this.socketRooms.has(socketId)) {
      this.socketRooms.set(socketId, new Set());
    }
    this.socketRooms.get(socketId)!.add(meetingId);

    return participant;
  }

  private removeFromRoom(meetingId: string, socketId: string): ParticipantInfo | undefined {
    const room = this.rooms.get(meetingId);
    if (!room) return undefined;

    const participant = room.get(socketId);
    if (!participant) return undefined;

    room.delete(socketId);

    if (room.size === 0) {
      this.rooms.delete(meetingId);
    }

    // Update the reverse index
    const socketMeetings = this.socketRooms.get(socketId);
    if (socketMeetings) {
      socketMeetings.delete(meetingId);
      if (socketMeetings.size === 0) {
        this.socketRooms.delete(socketId);
      }
    }

    return participant;
  }

  private getParticipants(meetingId: string): ParticipantInfo[] {
    const room = this.rooms.get(meetingId);
    return room ? Array.from(room.values()) : [];
  }

  private cleanupSocket(socket: AuthenticatedSocket): void {
    const meetingIds = this.socketRooms.get(socket.id);
    if (!meetingIds || meetingIds.size === 0) return;

    // Snapshot before iterating since removeFromRoom mutates socketRooms during the loop
    const snapshot = Array.from(meetingIds);
    for (const meetingId of snapshot) {
      this.removeFromRoomAndBroadcast(meetingId, socket);
    }
  }

  private removeFromRoomAndBroadcast(meetingId: string, socket: AuthenticatedSocket): void {
    const participant = this.removeFromRoom(meetingId, socket.id);
    if (!participant) return;

    void socket.leave(meetingId);
    this.logger.log(
      `User left room: meetingId=${meetingId} socketId=${socket.id} userId=${participant.userId}`,
    );

    // Notify video-call participants and lobby watchers
    this.server
      .to(meetingId)
      .to(`watch:${meetingId}`)
      .emit('participant-left', { meetingId, participant });
  }

  private extractToken(socket: AuthenticatedSocket): string | undefined {
    const authToken = socket.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const authHeader = socket.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return undefined;
  }
}
