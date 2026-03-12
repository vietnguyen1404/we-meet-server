/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { SignalingGateway } from './signaling.gateway';
import { UsersRepository } from '../users/users.repository';
import { MeetingsRepository } from '../meetings/meetings.repository';
import { SIGNALING_SESSION_SERVICE } from './signaling-session.interface';
import type { ParticipantInfo } from './signaling-session.interface';

// ── Constants ──────────────────────────────────────────────────────────────

const MEETING_UUID = '11111111-1111-4111-a111-111111111111';
const MEETING_UUID_2 = '22222222-2222-4222-a222-222222222222';
const TARGET_SOCKET_ID = 'socket-target';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns a chainable broadcast mock implementing .to().to().emit(). */
function createBroadcastChain() {
  const broadcastEmit = jest.fn();
  const chain = { to: jest.fn(), emit: broadcastEmit };
  chain.to.mockReturnValue(chain);
  return chain;
}

function createMockSocket(overrides: Record<string, unknown> = {}) {
  const broadcastChain = createBroadcastChain();
  return Object.assign(
    {
      id: 'socket-1',
      data: { user: undefined as Record<string, unknown> | undefined },
      handshake: { auth: {}, headers: {} },
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      to: jest.fn().mockReturnValue(broadcastChain),
    },
    { _broadcast: broadcastChain },
    overrides,
  ) as unknown as Parameters<SignalingGateway['handleJoinRoom']>[1] & {
    _broadcast: ReturnType<typeof createBroadcastChain>;
  };
}

const fakeUser = {
  id: 'user-1',
  email: 'alice@test.com',
  name: 'Alice',
  passwordHash: 'hashed',
  role: 'USER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const fakeParticipant: ParticipantInfo = {
  socketId: 'socket-1',
  userId: 'user-1',
  name: 'Alice',
  joinedAt: 0,
};

const fakeParticipant2: ParticipantInfo = {
  socketId: 'socket-2',
  userId: 'user-2',
  name: 'Bob',
  joinedAt: 0,
};

// ── Test suite ─────────────────────────────────────────────────────────────

describe('SignalingGateway', () => {
  let gateway: SignalingGateway;
  let meetingsRepository: { findById: jest.Mock; findMemberByMeetingAndUser: jest.Mock };
  let jwtService: { verify: jest.Mock };
  let usersRepository: { findById: jest.Mock };
  let mockSessionService: {
    addParticipant: jest.Mock;
    removeParticipant: jest.Mock;
    getParticipants: jest.Mock;
    getSocketRooms: jest.Mock;
    isParticipant: jest.Mock;
  };
  let mockServerToChain: { to: jest.Mock; emit: jest.Mock };

  beforeEach(async () => {
    meetingsRepository = {
      findById: jest.fn(),
      findMemberByMeetingAndUser: jest.fn(),
    };
    jwtService = { verify: jest.fn() };
    usersRepository = { findById: jest.fn() };
    mockSessionService = {
      addParticipant: jest.fn().mockReturnValue(fakeParticipant),
      removeParticipant: jest.fn().mockReturnValue(undefined),
      getParticipants: jest.fn().mockReturnValue([]),
      getSocketRooms: jest.fn().mockReturnValue(new Set<string>()),
      isParticipant: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalingGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: UsersRepository, useValue: usersRepository },
        { provide: MeetingsRepository, useValue: meetingsRepository },
        { provide: SIGNALING_SESSION_SERVICE, useValue: mockSessionService },
      ],
    }).compile();

    gateway = module.get<SignalingGateway>(SignalingGateway);

    // Provide a mock server for broadcast operations
    const serverEmit = jest.fn();
    mockServerToChain = { to: jest.fn(), emit: serverEmit };
    mockServerToChain.to.mockReturnValue(mockServerToChain);
    (gateway as unknown as { server: { to: jest.Mock } }).server = {
      to: jest.fn().mockReturnValue(mockServerToChain),
    };
  });

  // ── handleConnection ──────────────────────────────────────────────────

  describe('handleConnection', () => {
    function createConnectionSocket(token?: string) {
      return {
        id: 'socket-conn-1',
        data: {} as Record<string, unknown>,
        handshake: { auth: token ? { token } : {}, headers: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
        to: jest.fn().mockReturnThis(),
      } as unknown as Parameters<SignalingGateway['handleConnection']>[0];
    }

    it('should disconnect with 401 when no token is provided', async () => {
      const socket = createConnectionSocket();

      await gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'Missing authentication token',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should disconnect with 401 when JWT verification throws', async () => {
      const socket = createConnectionSocket('bad-token');
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'invalid signature',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should disconnect with 401 when user is not found in the database', async () => {
      const socket = createConnectionSocket('valid-token');
      jwtService.verify.mockReturnValue({ userId: 'ghost-user' });
      usersRepository.findById.mockResolvedValue(null);

      await gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'User not found',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should set socket.data.user (without passwordHash) on successful auth', async () => {
      const socket = createConnectionSocket('valid-token');
      jwtService.verify.mockReturnValue({ userId: 'user-1' });
      usersRepository.findById.mockResolvedValue(fakeUser);

      await gateway.handleConnection(socket);

      expect(socket.emit).not.toHaveBeenCalled();
      expect(socket.disconnect).not.toHaveBeenCalled();
      const storedUser = socket.data.user as Record<string, unknown>;
      expect(storedUser).toBeDefined();
      expect(storedUser.id).toBe('user-1');
      expect(storedUser.passwordHash).toBeUndefined();
    });
  });

  // ── join-room ──────────────────────────────────────────────────────────

  describe('handleJoinRoom', () => {
    it('should emit 401 when socket has no user', async () => {
      const socket = createMockSocket();
      socket.data.user = undefined;

      await gateway.handleJoinRoom({ meetingId: MEETING_UUID }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'Not authenticated',
      });
    });

    it('should emit 400 when meetingId is not a valid UUID', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;

      await gateway.handleJoinRoom({ meetingId: 'bad-id' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 400 }));
    });

    it('should emit 404 when meeting does not exist', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue(null);

      await gateway.handleJoinRoom({ meetingId: MEETING_UUID }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 404,
        message: 'Meeting ' + MEETING_UUID + ' not found',
      });
    });

    it('should emit 403 when user is not a member', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: MEETING_UUID });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue(null);

      await gateway.handleJoinRoom({ meetingId: MEETING_UUID }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 403,
        message: 'Not a member of this meeting',
      });
    });

    it('should be a no-op when socket is already in the room', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: MEETING_UUID });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });
      mockSessionService.isParticipant.mockReturnValue(true);

      await gateway.handleJoinRoom({ meetingId: MEETING_UUID }, socket);

      expect(socket.join).not.toHaveBeenCalled();
      expect(mockSessionService.addParticipant).not.toHaveBeenCalled();
    });

    it('should join room, call addParticipant, broadcast, and emit participants-list', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: MEETING_UUID });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });
      mockSessionService.isParticipant.mockReturnValue(false);
      mockSessionService.addParticipant.mockReturnValue(fakeParticipant);
      mockSessionService.getParticipants.mockReturnValue([fakeParticipant]);

      await gateway.handleJoinRoom({ meetingId: MEETING_UUID }, socket);

      expect(socket.join).toHaveBeenCalledWith(MEETING_UUID);
      expect(mockSessionService.addParticipant).toHaveBeenCalledWith(
        MEETING_UUID,
        'socket-1',
        expect.objectContaining({ id: 'user-1' }),
      );
      expect(socket.to).toHaveBeenCalledWith(MEETING_UUID);
      expect(socket._broadcast.emit).toHaveBeenCalledWith(
        'participant-joined',
        expect.objectContaining({
          meetingId: MEETING_UUID,
          participant: expect.objectContaining({ userId: 'user-1', name: 'Alice' }),
        }),
      );
      expect(socket.emit).toHaveBeenCalledWith(
        'participants-list',
        expect.objectContaining({
          meetingId: MEETING_UUID,
          participants: [fakeParticipant],
        }),
      );
    });
  });

  // ── leave-room ─────────────────────────────────────────────────────────

  describe('handleLeaveRoom', () => {
    it('should emit 401 when socket has no user', () => {
      const socket = createMockSocket();
      socket.data.user = undefined;

      gateway.handleLeaveRoom({ meetingId: MEETING_UUID }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'Not authenticated',
      });
    });

    it('should emit 400 when meetingId is not a valid UUID', () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;

      gateway.handleLeaveRoom({ meetingId: 'bad-id' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 400 }));
    });

    it('should do nothing if socket is not in the room', () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      mockSessionService.removeParticipant.mockReturnValue(undefined);

      gateway.handleLeaveRoom({ meetingId: MEETING_UUID }, socket);

      expect(socket.leave).not.toHaveBeenCalled();
    });

    it('should leave room and broadcast participant-left', () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      mockSessionService.removeParticipant.mockReturnValue(fakeParticipant);

      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      mockServer.server.to.mockReturnValue(mockServerToChain);

      gateway.handleLeaveRoom({ meetingId: MEETING_UUID }, socket);

      expect(socket.leave).toHaveBeenCalledWith(MEETING_UUID);
      expect(mockServer.server.to).toHaveBeenCalledWith(MEETING_UUID);
      expect(mockServerToChain.emit).toHaveBeenCalledWith(
        'participant-left',
        expect.objectContaining({
          meetingId: MEETING_UUID,
          participant: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });

  // ── watch-meeting ──────────────────────────────────────────────────────

  describe('handleWatchMeeting', () => {
    it('should emit 401 when socket has no user', async () => {
      const socket = createMockSocket();
      socket.data.user = undefined;

      await gateway.handleWatchMeeting({ meetingId: MEETING_UUID }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'Not authenticated',
      });
    });

    it('should emit 400 when meetingId is not a valid UUID', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;

      await gateway.handleWatchMeeting({ meetingId: 'not-a-uuid' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 400 }));
    });

    it('should emit 404 when meeting does not exist', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue(null);

      await gateway.handleWatchMeeting({ meetingId: MEETING_UUID }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 404,
        message: 'Meeting ' + MEETING_UUID + ' not found',
      });
    });

    it('should emit 403 when user is not a member of the meeting', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: MEETING_UUID });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue(null);

      await gateway.handleWatchMeeting({ meetingId: MEETING_UUID }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 403,
        message: 'Not a member of this meeting',
      });
    });

    it('should join watch room and emit current participants-list on success', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: MEETING_UUID });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });
      mockSessionService.getParticipants.mockReturnValue([fakeParticipant]);

      await gateway.handleWatchMeeting({ meetingId: MEETING_UUID }, socket);

      expect(socket.join).toHaveBeenCalledWith('watch:' + MEETING_UUID);
      expect(socket.emit).toHaveBeenCalledWith('participants-list', {
        meetingId: MEETING_UUID,
        participants: [fakeParticipant],
      });
    });
  });

  // ── WebRTC relay: offer / answer / ice-candidate ───────────────────────

  describe('handleOffer / handleAnswer / handleIceCandidate', () => {
    const relayPayload = { sdp: 'REDACTED' };

    function setupBothParticipants() {
      mockSessionService.isParticipant.mockReturnValueOnce(true).mockReturnValueOnce(true);
    }

    it('should relay offer to the target socket', () => {
      const sender = createMockSocket({ id: 'socket-1' });
      sender.data.user = fakeUser as never;
      setupBothParticipants();

      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      mockServer.server.to.mockReturnValue(mockServerToChain);

      gateway.handleOffer(
        { meetingId: MEETING_UUID, targetSocketId: TARGET_SOCKET_ID, payload: relayPayload },
        sender,
      );

      expect(mockServer.server.to).toHaveBeenCalledWith(TARGET_SOCKET_ID);
      expect(mockServerToChain.emit).toHaveBeenCalledWith('offer', {
        fromSocketId: 'socket-1',
        payload: relayPayload,
      });
    });

    it('should relay answer to the target socket', () => {
      const sender = createMockSocket({ id: 'socket-1' });
      sender.data.user = fakeUser as never;
      setupBothParticipants();

      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      mockServer.server.to.mockReturnValue(mockServerToChain);

      gateway.handleAnswer(
        { meetingId: MEETING_UUID, targetSocketId: TARGET_SOCKET_ID, payload: { sdp: 'answer' } },
        sender,
      );

      expect(mockServerToChain.emit).toHaveBeenCalledWith(
        'answer',
        expect.objectContaining({ fromSocketId: 'socket-1' }),
      );
    });

    it('should relay ice-candidate to the target socket', () => {
      const sender = createMockSocket({ id: 'socket-1' });
      sender.data.user = fakeUser as never;
      setupBothParticipants();

      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      mockServer.server.to.mockReturnValue(mockServerToChain);

      gateway.handleIceCandidate(
        { meetingId: MEETING_UUID, targetSocketId: TARGET_SOCKET_ID, payload: { candidate: 'x' } },
        sender,
      );

      expect(mockServerToChain.emit).toHaveBeenCalledWith(
        'ice-candidate',
        expect.objectContaining({ fromSocketId: 'socket-1' }),
      );
    });

    it('should emit 401 when sender is not authenticated', () => {
      const socket = createMockSocket();
      socket.data.user = undefined;

      gateway.handleOffer(
        { meetingId: MEETING_UUID, targetSocketId: TARGET_SOCKET_ID, payload: {} },
        socket,
      );

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'Not authenticated',
      });
    });

    it('should emit 400 when meetingId is not a valid UUID', () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;

      gateway.handleOffer(
        { meetingId: 'not-a-uuid', targetSocketId: TARGET_SOCKET_ID, payload: {} },
        socket,
      );

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 400 }));
    });

    it('should emit 400 when targetSocketId is empty', () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;

      gateway.handleOffer({ meetingId: MEETING_UUID, targetSocketId: '', payload: {} }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 400 }));
    });

    it('should emit 403 when sender is not in the room', () => {
      const socket = createMockSocket({ id: 'socket-not-in-room' });
      socket.data.user = fakeUser as never;
      mockSessionService.isParticipant.mockReturnValue(false);

      gateway.handleOffer(
        { meetingId: MEETING_UUID, targetSocketId: TARGET_SOCKET_ID, payload: {} },
        socket,
      );

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 403,
        message: 'You are not in this room',
      });
    });

    it('should emit 404 when target is not in the room', () => {
      const socket = createMockSocket({ id: 'socket-1' });
      socket.data.user = fakeUser as never;
      mockSessionService.isParticipant.mockReturnValueOnce(true).mockReturnValueOnce(false);

      gateway.handleOffer(
        { meetingId: MEETING_UUID, targetSocketId: 'unknown-target', payload: {} },
        socket,
      );

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 404,
        message: 'Target socket is not in this room',
      });
    });

    it('should emit 429 when rate limit is exceeded (>30 per window)', () => {
      const socket = createMockSocket({ id: 'socket-rl' });
      socket.data.user = fakeUser as never;
      mockSessionService.isParticipant.mockReturnValue(true);

      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      mockServer.server.to.mockReturnValue(mockServerToChain);

      for (let i = 0; i < 30; i++) {
        gateway.handleOffer(
          { meetingId: MEETING_UUID, targetSocketId: TARGET_SOCKET_ID, payload: {} },
          socket,
        );
      }

      (socket.emit as jest.Mock).mockClear();
      gateway.handleOffer(
        { meetingId: MEETING_UUID, targetSocketId: TARGET_SOCKET_ID, payload: {} },
        socket,
      );

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 429,
        message: 'Rate limit exceeded for signaling events',
      });
    });
  });

  // ── handleDisconnect ───────────────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('should produce no broadcasts when socket was in no rooms', () => {
      const socket = createMockSocket();
      mockSessionService.getSocketRooms.mockReturnValue(new Set<string>());

      gateway.handleDisconnect(socket);

      expect(mockServerToChain.emit).not.toHaveBeenCalled();
    });

    it('should clean up all rooms the socket was registered in', () => {
      const socket = createMockSocket({ id: 'socket-1' });
      socket.data.user = fakeUser as never;
      mockSessionService.getSocketRooms.mockReturnValue(
        new Set<string>([MEETING_UUID, MEETING_UUID_2]),
      );
      mockSessionService.removeParticipant
        .mockReturnValueOnce({ ...fakeParticipant, socketId: 'socket-1' })
        .mockReturnValueOnce({ ...fakeParticipant2, socketId: 'socket-1' });

      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      mockServer.server.to.mockReturnValue(mockServerToChain);

      gateway.handleDisconnect(socket);

      expect(mockSessionService.removeParticipant).toHaveBeenCalledTimes(2);
      expect(mockServerToChain.emit).toHaveBeenCalledTimes(2);
      expect(mockServerToChain.emit).toHaveBeenCalledWith(
        'participant-left',
        expect.objectContaining({ meetingId: MEETING_UUID }),
      );
      expect(mockServerToChain.emit).toHaveBeenCalledWith(
        'participant-left',
        expect.objectContaining({ meetingId: MEETING_UUID_2 }),
      );
    });

    it('should not throw after a rate-limited socket disconnects', () => {
      const socket = createMockSocket({ id: 'socket-rl' });
      socket.data.user = fakeUser as never;
      mockSessionService.isParticipant.mockReturnValue(true);

      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      mockServer.server.to.mockReturnValue(mockServerToChain);

      gateway.handleOffer(
        { meetingId: MEETING_UUID, targetSocketId: TARGET_SOCKET_ID, payload: {} },
        socket,
      );

      expect(() => gateway.handleDisconnect(socket)).not.toThrow();
    });
  });
});
