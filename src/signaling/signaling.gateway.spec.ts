/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { SignalingGateway, ParticipantInfo } from './signaling.gateway';
import { UsersRepository } from '../users/users.repository';
import { MeetingsRepository } from '../meetings/meetings.repository';

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockSocket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'socket-1',
    data: { user: undefined as Record<string, unknown> | undefined },
    handshake: { auth: {}, headers: {} },
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    to: jest.fn().mockReturnThis(),
    ...overrides,
  } as unknown as Parameters<SignalingGateway['handleJoinRoom']>[1];
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

const fakeUser2 = {
  id: 'user-2',
  email: 'bob@test.com',
  name: 'Bob',
  passwordHash: 'hashed',
  role: 'USER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Test suite ─────────────────────────────────────────────────────────────

describe('SignalingGateway', () => {
  let gateway: SignalingGateway;
  let meetingsRepository: { findById: jest.Mock; findMemberByMeetingAndUser: jest.Mock };
  let jwtService: { verify: jest.Mock };
  let usersRepository: { findById: jest.Mock };

  beforeEach(async () => {
    meetingsRepository = {
      findById: jest.fn(),
      findMemberByMeetingAndUser: jest.fn(),
    };
    jwtService = { verify: jest.fn() };
    usersRepository = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalingGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: UsersRepository, useValue: usersRepository },
        { provide: MeetingsRepository, useValue: meetingsRepository },
      ],
    }).compile();

    gateway = module.get<SignalingGateway>(SignalingGateway);

    // Provide a mock server for broadcast operations
    (gateway as unknown as { server: { to: jest.Mock } }).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
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

      await gateway.handleJoinRoom({ meetingId: 'meeting-1' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'Not authenticated',
      });
    });

    it('should emit 404 when meeting does not exist', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue(null);

      await gateway.handleJoinRoom({ meetingId: 'bad-id' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 404,
        message: 'Meeting bad-id not found',
      });
    });

    it('should emit 403 when user is not a member', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: 'meeting-1' });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue(null);

      await gateway.handleJoinRoom({ meetingId: 'meeting-1' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 403,
        message: 'Not a member of this meeting',
      });
    });

    it('should join room, add to presence, and broadcast', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: 'meeting-1' });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });

      const toEmit = jest.fn();
      (socket.to as jest.Mock).mockReturnValue({ emit: toEmit });

      await gateway.handleJoinRoom({ meetingId: 'meeting-1' }, socket);

      expect(socket.join).toHaveBeenCalledWith('meeting-1');
      expect(socket.to).toHaveBeenCalledWith('meeting-1');
      expect(toEmit).toHaveBeenCalledWith(
        'participant-joined',
        expect.objectContaining({
          meetingId: 'meeting-1',
          participant: expect.objectContaining({
            userId: 'user-1',
            name: 'Alice',
            socketId: 'socket-1',
          }),
        }),
      );
    });
  });

  // ── leave-room ─────────────────────────────────────────────────────────

  describe('handleLeaveRoom', () => {
    it('should do nothing if socket is not in the room', () => {
      const socket = createMockSocket();
      gateway.handleLeaveRoom({ meetingId: 'meeting-1' }, socket);

      expect(socket.leave).not.toHaveBeenCalled();
    });

    it('should remove from room and broadcast participant-left', async () => {
      // First join
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: 'meeting-1' });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });
      (socket.to as jest.Mock).mockReturnValue({ emit: jest.fn() });
      await gateway.handleJoinRoom({ meetingId: 'meeting-1' }, socket);

      // Then leave
      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      const serverEmit = jest.fn();
      mockServer.server.to.mockReturnValue({ emit: serverEmit });

      gateway.handleLeaveRoom({ meetingId: 'meeting-1' }, socket);

      expect(socket.leave).toHaveBeenCalledWith('meeting-1');
      expect(mockServer.server.to).toHaveBeenCalledWith('meeting-1');
      expect(serverEmit).toHaveBeenCalledWith(
        'participant-left',
        expect.objectContaining({
          meetingId: 'meeting-1',
          participant: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });

  // ── get-participants ───────────────────────────────────────────────────

  describe('handleGetParticipants', () => {
    it('should emit 401 when socket has no user', async () => {
      const socket = createMockSocket();
      socket.data.user = undefined;

      await gateway.handleGetParticipants({ meetingId: 'meeting-1' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 401,
        message: 'Not authenticated',
      });
    });

    it('should emit 403 when user is not a member', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue(null);

      await gateway.handleGetParticipants({ meetingId: 'meeting-1' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 403,
        message: 'Not a member of this meeting',
      });
    });

    it('should return the participant list for the room', async () => {
      // Join first
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: 'meeting-1' });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });
      (socket.to as jest.Mock).mockReturnValue({ emit: jest.fn() });
      await gateway.handleJoinRoom({ meetingId: 'meeting-1' }, socket);

      // Get participants
      (socket.emit as jest.Mock).mockClear();
      await gateway.handleGetParticipants({ meetingId: 'meeting-1' }, socket);

      expect(socket.emit).toHaveBeenCalledWith(
        'participants-list',
        expect.objectContaining({
          meetingId: 'meeting-1',
          participants: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-1', name: 'Alice' }),
          ]),
        }),
      );
    });

    it('should return empty list for a room with no participants', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });

      await gateway.handleGetParticipants({ meetingId: 'meeting-1' }, socket);

      expect(socket.emit).toHaveBeenCalledWith('participants-list', {
        meetingId: 'meeting-1',
        participants: [],
      });
    });
  });

  // ── disconnect cleanup ─────────────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('should clean up all rooms the socket was in', async () => {
      // Join two rooms
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: 'meeting-1' });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });
      (socket.to as jest.Mock).mockReturnValue({ emit: jest.fn() });
      await gateway.handleJoinRoom({ meetingId: 'meeting-1' }, socket);

      meetingsRepository.findById.mockResolvedValue({ id: 'meeting-2' });
      await gateway.handleJoinRoom({ meetingId: 'meeting-2' }, socket);

      // Disconnect
      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      const serverEmit = jest.fn();
      mockServer.server.to.mockReturnValue({ emit: serverEmit });

      gateway.handleDisconnect(socket);

      // Should have broadcast participant-left for both rooms
      expect(serverEmit).toHaveBeenCalledTimes(2);
      expect(serverEmit).toHaveBeenCalledWith(
        'participant-left',
        expect.objectContaining({ meetingId: 'meeting-1' }),
      );
      expect(serverEmit).toHaveBeenCalledWith(
        'participant-left',
        expect.objectContaining({ meetingId: 'meeting-2' }),
      );
    });

    it('should clean up empty rooms after last participant leaves', async () => {
      const socket = createMockSocket();
      socket.data.user = fakeUser as never;
      meetingsRepository.findById.mockResolvedValue({ id: 'meeting-1' });
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-1' });
      (socket.to as jest.Mock).mockReturnValue({ emit: jest.fn() });
      await gateway.handleJoinRoom({ meetingId: 'meeting-1' }, socket);

      // Verify room exists
      const socket2 = createMockSocket({ id: 'socket-2' });
      socket2.data.user = fakeUser2 as never;
      meetingsRepository.findMemberByMeetingAndUser.mockResolvedValue({ id: 'member-2' });
      await gateway.handleGetParticipants({ meetingId: 'meeting-1' }, socket2);
      const firstCall = (socket2.emit as jest.Mock).mock.calls[0];
      const participants = (firstCall[1] as { participants: ParticipantInfo[] }).participants;
      expect(participants).toHaveLength(1);

      // Disconnect last participant
      const mockServer = gateway as unknown as { server: { to: jest.Mock } };
      mockServer.server.to.mockReturnValue({ emit: jest.fn() });
      gateway.handleDisconnect(socket);

      // Room should be empty
      (socket2.emit as jest.Mock).mockClear();
      await gateway.handleGetParticipants({ meetingId: 'meeting-1' }, socket2);
      const secondCall = (socket2.emit as jest.Mock).mock.calls[0];
      const remaining = (secondCall[1] as { participants: ParticipantInfo[] }).participants;
      expect(remaining).toHaveLength(0);
    });
  });
});
