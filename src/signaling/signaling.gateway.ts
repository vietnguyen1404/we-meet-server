import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { User } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { UsersRepository } from '../users/users.repository';
import { MeetingsRepository } from '../meetings/meetings.repository';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SIGNALING_SESSION_SERVICE } from './signaling-session.interface';
import type { ISignalingSessionService, ParticipantInfo } from './signaling-session.interface';
import { SignalingRateLimiterService, SignalingEvent } from './signaling-rate-limiter.service';
import { WatchMeetingDto } from './dto/watch-meeting.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { OfferDto } from './dto/offer.dto';
import { AnswerDto } from './dto/answer.dto';
import { IceCandidateDto } from './dto/ice-candidate.dto';
import { ParticipantMediaStateDto } from './dto/participant-media-state.dto';

export type { ParticipantInfo };

interface SignalingRelayServerPayload {
  fromSocketId: string;
  payload: unknown;
}

interface ServerToClientEvents {
  error: (data: { code: number; message: string }) => void;
  'participant-joined': (data: { meetingId: string; participant: ParticipantInfo }) => void;
  'participant-left': (data: { meetingId: string; participant: ParticipantInfo }) => void;
  'participants-list': (data: { meetingId: string; participants: ParticipantInfo[] }) => void;
  'participant-media-state': (data: {
    meetingId: string;
    userId: string;
    video: boolean;
    audio: boolean;
  }) => void;
  offer: (data: SignalingRelayServerPayload) => void;
  answer: (data: SignalingRelayServerPayload) => void;
  'ice-candidate': (data: SignalingRelayServerPayload) => void;
}

interface ClientToServerEvents {
  'watch-meeting': (payload: WatchMeetingDto) => void;
  'join-room': (payload: JoinRoomDto) => void;
  'leave-room': (payload: LeaveRoomDto) => void;
  'participant-media-state': (payload: ParticipantMediaStateDto) => void;
  offer: (payload: OfferDto) => void;
  answer: (payload: AnswerDto) => void;
  'ice-candidate': (payload: IceCandidateDto) => void;
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

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
    private readonly meetingsRepository: MeetingsRepository,
    @Inject(SIGNALING_SESSION_SERVICE)
    private readonly sessionService: ISignalingSessionService,
    private readonly rateLimiter: SignalingRateLimiterService,
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
      this.logger.log(
        `event=connect socketId=${socket.id} userId=${user.id} ts=${new Date().toISOString()}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      this.logger.warn(
        `event=connect-rejected socketId=${socket.id} reason=${message} ts=${new Date().toISOString()}`,
      );
      socket.emit('error', { code: 401, message });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    const userId: string | undefined = socket.data.user?.id;
    this.logger.log(
      `event=disconnect socketId=${socket.id} userId=${userId ?? 'unauthenticated'} ts=${new Date().toISOString()}`,
    );

    this.rateLimiter.clearSocket(socket.id);
    this.cleanupSocket(socket);
  }

  @SubscribeMessage('watch-meeting')
  async handleWatchMeeting(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): Promise<void> {
    if (!socket.data.user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    const dto = this.validateSocketPayload(WatchMeetingDto, raw, socket);
    if (!dto) return;

    const { meetingId } = dto;

    const meeting = await this.resolveAndValidateMeeting(meetingId, socket);
    if (!meeting) return;

    await socket.join(`watch:${meetingId}`);
    this.logger.log(
      `event=watch-meeting meetingId=${meetingId} socketId=${socket.id} userId=${socket.data.user.id} ts=${new Date().toISOString()}`,
    );

    socket.emit('participants-list', {
      meetingId,
      participants: this.sessionService.getParticipants(meetingId),
    });
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): Promise<void> {
    const user = socket.data.user;
    if (!user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    const dto = this.validateSocketPayload(JoinRoomDto, raw, socket);
    if (!dto) return;

    const { meetingId } = dto;

    // No-op if already present — prevents duplicate participant-joined broadcasts
    if (this.sessionService.isParticipant(meetingId, socket.id)) return;

    const meeting = await this.canJoinMeeting(meetingId, user, socket);
    if (!meeting) return;

    const isHost = user.id === meeting.hostId;

    await socket.join(meetingId);
    const { participant, evictedSocketId } = this.sessionService.addParticipant(
      meetingId,
      socket.id,
      user,
      isHost,
    );

    if (evictedSocketId) {
      this.server.sockets.sockets.get(evictedSocketId)?.disconnect(true);
    }

    this.logger.log(
      `event=join-room meetingId=${meetingId} socketId=${socket.id} userId=${user.id} ts=${new Date().toISOString()}`,
    );

    socket.to(meetingId).to(`watch:${meetingId}`).emit('participant-joined', {
      meetingId,
      participant,
    });

    socket.emit('participants-list', {
      meetingId,
      participants: this.sessionService.getParticipants(meetingId),
    });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): void {
    const user = socket.data.user;
    if (!user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    const dto = this.validateSocketPayload(LeaveRoomDto, raw, socket);
    if (!dto) return;

    if (!this.sessionService.isParticipant(dto.meetingId, socket.id)) return;

    this.logger.log(
      `event=leave-room meetingId=${dto.meetingId} socketId=${socket.id} userId=${user.id} ts=${new Date().toISOString()}`,
    );

    this.removeFromRoomAndBroadcast(socket);
  }

  @SubscribeMessage('participant-media-state')
  handleParticipantMediaState(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): void {
    const user = socket.data.user;
    this.logger.debug(
      `Received participant-media-state from socketId=${socket.id}: ${JSON.stringify(raw)}`,
    );

    if (!user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    const dto = this.validateSocketPayload(ParticipantMediaStateDto, raw, socket);
    if (!dto) return;

    const { meetingId, video, audio } = dto;

    if (!this.sessionService.isParticipant(meetingId, socket.id)) {
      socket.emit('error', { code: 403, message: 'You are not in this room' });
      return;
    }

    const result = this.sessionService.updateMediaState(socket.id, video, audio);
    if (!result) {
      socket.emit('error', { code: 500, message: 'Failed to update media state' });
      return;
    }

    this.logger.log(
      `event=participant-media-state meetingId=${meetingId} userId=${user.id} video=${String(video)} audio=${String(audio)} ts=${new Date().toISOString()}`,
    );

    socket.to(meetingId).emit('participant-media-state', {
      meetingId,
      userId: user.id,
      video,
      audio,
    });
  }

  @SubscribeMessage('offer')
  handleOffer(@MessageBody() raw: unknown, @ConnectedSocket() socket: AuthenticatedSocket): void {
    this.handleSignalingRelay('offer', OfferDto, raw, socket);
  }

  @SubscribeMessage('answer')
  handleAnswer(@MessageBody() raw: unknown, @ConnectedSocket() socket: AuthenticatedSocket): void {
    this.handleSignalingRelay('answer', AnswerDto, raw, socket);
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() raw: unknown,
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): void {
    this.handleSignalingRelay('ice-candidate', IceCandidateDto, raw, socket);
  }

  private handleSignalingRelay(
    event: SignalingEvent,
    dtoClass: new () => OfferDto | AnswerDto | IceCandidateDto,
    raw: unknown,
    socket: AuthenticatedSocket,
  ): void {
    if (!socket.data.user) {
      socket.emit('error', { code: 401, message: 'Not authenticated' });
      return;
    }

    const dto = this.validateSocketPayload(dtoClass, raw, socket);
    if (!dto) return;

    if (!this.rateLimiter.check(socket.id, event)) {
      socket.emit('error', { code: 429, message: 'Too many signaling events' });
      return;
    }

    const { meetingId, targetSocketId } = dto;

    if (!this.sessionService.isParticipant(meetingId, socket.id)) {
      socket.emit('error', { code: 403, message: 'You are not in this room' });
      return;
    }

    if (!this.sessionService.isParticipant(meetingId, targetSocketId)) {
      socket.emit('error', { code: 404, message: 'Target socket is not in this room' });
      return;
    }

    this.logger.log(
      `event=${event} meetingId=${meetingId} socketId=${socket.id} userId=${socket.data.user.id} targetSocketId=${targetSocketId} ts=${new Date().toISOString()}`,
    );

    this.server.to(targetSocketId).emit(event, { fromSocketId: socket.id, payload: dto.payload });
  }

  private removeFromRoomAndBroadcast(socket: AuthenticatedSocket): void {
    const result = this.sessionService.removeParticipant(socket.id);
    if (!result) return;

    const { meetingId, participant } = result;
    void socket.leave(meetingId);
    this.logger.log(
      `event=left-room meetingId=${meetingId} socketId=${socket.id} userId=${participant.userId} ts=${new Date().toISOString()}`,
    );

    this.server
      .to(meetingId)
      .to(`watch:${meetingId}`)
      .emit('participant-left', { meetingId, participant });
  }

  private cleanupSocket(socket: AuthenticatedSocket): void {
    this.removeFromRoomAndBroadcast(socket);
  }

  // ── Join-gating ────────────────────────────────────────────────────────
  // These two methods form the single extension point for future join-flow
  // changes (e.g. request-join / host-approval). All meeting-existence and
  // authorization checks are funnelled through here so the handler methods
  // stay thin.

  /**
   * Resolve a meeting by ID and emit a 404 error on the socket if it does
   * not exist. Used by both `handleWatchMeeting` and `canJoinMeeting`.
   */
  private async resolveAndValidateMeeting(
    meetingId: string,
    socket: AuthenticatedSocket,
  ): Promise<Awaited<ReturnType<MeetingsRepository['findById']>> | null> {
    const meeting = await this.meetingsRepository.findById(meetingId);
    if (!meeting) {
      socket.emit('error', { code: 404, message: `Meeting ${meetingId} not found` });
      return null;
    }
    return meeting;
  }

  /**
   * Determine whether a user is allowed to enter the active call.
   *
   * Currently any authenticated user with a valid meeting ID may join
   * (stateless, Google Meet–style). To add an approval gate in the future,
   * insert the check here — for example:
   *
   * ```ts
   * if (await this.joinApprovalService.isPending(meetingId, user.id)) {
   *   socket.emit('error', { code: 403, message: 'Waiting for host approval' });
   *   return null;
   * }
   * ```
   *
   * @returns The meeting record when join is permitted, or `null` if the
   *          request was rejected (error already emitted to the socket).
   */
  private async canJoinMeeting(
    meetingId: string,
    _user: Omit<User, 'passwordHash'>,
    socket: AuthenticatedSocket,
  ): Promise<Awaited<ReturnType<MeetingsRepository['findById']>> | null> {
    return this.resolveAndValidateMeeting(meetingId, socket);
  }

  private validateSocketPayload<T extends object>(
    cls: new () => T,
    raw: unknown,
    socket: AuthenticatedSocket,
  ): T | null {
    const instance = plainToInstance(cls, raw);
    const errors: ValidationError[] = validateSync(instance as object, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    if (errors.length > 0) {
      const firstMessage = Object.values(errors[0].constraints ?? {})[0] ?? 'Invalid payload';
      this.logger.warn(
        `event=validation-failed socketId=${socket.id} constraint=${firstMessage} ts=${new Date().toISOString()}`,
      );
      socket.emit('error', { code: 400, message: firstMessage });
      return null;
    }
    return instance;
  }

  private extractToken(socket: AuthenticatedSocket): string | undefined {
    const authToken = socket.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const authHeader = socket.handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return undefined;
  }
}
