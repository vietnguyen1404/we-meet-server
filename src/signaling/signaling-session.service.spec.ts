import { SignalingSessionService } from './signaling-session.service';

const MEETING_UUID = '11111111-1111-4111-a111-111111111111';
const MEETING_UUID_2 = '22222222-2222-4222-a222-222222222222';

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

describe('SignalingSessionService', () => {
  let service: SignalingSessionService;

  beforeEach(() => {
    service = new SignalingSessionService();
  });

  // ── addParticipant ───────────────────────────────────────────────────

  describe('addParticipant', () => {
    it('should return a ParticipantInfo with correct fields', () => {
      const participant = service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);

      expect(participant.socketId).toBe('socket-1');
      expect(participant.userId).toBe('user-1');
      expect(participant.name).toBe('Alice');
      expect(typeof participant.joinedAt).toBe('number');
    });

    it('should make isParticipant return true after adding', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);

      expect(service.isParticipant(MEETING_UUID, 'socket-1')).toBe(true);
    });

    it('should register the meeting in getSocketRooms for the socket', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);

      expect(service.getSocketRooms('socket-1').has(MEETING_UUID)).toBe(true);
    });

    it('should track multiple sockets in the same room independently', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      service.addParticipant(MEETING_UUID, 'socket-2', fakeUser2);

      expect(service.isParticipant(MEETING_UUID, 'socket-1')).toBe(true);
      expect(service.isParticipant(MEETING_UUID, 'socket-2')).toBe(true);
    });

    it('should track one socket across multiple rooms', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      service.addParticipant(MEETING_UUID_2, 'socket-1', fakeUser);

      const rooms = service.getSocketRooms('socket-1');
      expect(rooms.has(MEETING_UUID)).toBe(true);
      expect(rooms.has(MEETING_UUID_2)).toBe(true);
    });
  });

  // ── removeParticipant ────────────────────────────────────────────────

  describe('removeParticipant', () => {
    it('should return undefined for an unknown socketId', () => {
      const result = service.removeParticipant(MEETING_UUID, 'ghost-socket');
      expect(result).toBeUndefined();
    });

    it('should return undefined when meetingId does not exist', () => {
      const result = service.removeParticipant('nonexistent-meeting', 'socket-1');
      expect(result).toBeUndefined();
    });

    it('should return the removed ParticipantInfo', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);

      const removed = service.removeParticipant(MEETING_UUID, 'socket-1');

      expect(removed).toBeDefined();
      expect(removed!.socketId).toBe('socket-1');
      expect(removed!.userId).toBe('user-1');
    });

    it('should make isParticipant return false after removing', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      service.removeParticipant(MEETING_UUID, 'socket-1');

      expect(service.isParticipant(MEETING_UUID, 'socket-1')).toBe(false);
    });

    it('should clean up the room entry when the last participant leaves', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      service.removeParticipant(MEETING_UUID, 'socket-1');

      // Room entry gone — getParticipants returns empty array, not throws
      expect(service.getParticipants(MEETING_UUID)).toEqual([]);
    });

    it('should remove the meeting from getSocketRooms when participant leaves', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      service.removeParticipant(MEETING_UUID, 'socket-1');

      expect(service.getSocketRooms('socket-1').has(MEETING_UUID)).toBe(false);
    });

    it('should not remove other rooms from getSocketRooms when leaving one room', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      service.addParticipant(MEETING_UUID_2, 'socket-1', fakeUser);

      service.removeParticipant(MEETING_UUID, 'socket-1');

      expect(service.getSocketRooms('socket-1').has(MEETING_UUID)).toBe(false);
      expect(service.getSocketRooms('socket-1').has(MEETING_UUID_2)).toBe(true);
    });

    it('should not remove other participants when one leaves', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      service.addParticipant(MEETING_UUID, 'socket-2', fakeUser2);

      service.removeParticipant(MEETING_UUID, 'socket-1');

      expect(service.isParticipant(MEETING_UUID, 'socket-2')).toBe(true);
    });
  });

  // ── getParticipants ──────────────────────────────────────────────────

  describe('getParticipants', () => {
    it('should return an empty array for a non-existent room', () => {
      expect(service.getParticipants('no-such-room')).toEqual([]);
    });

    it('should return the correct participants after adding', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      service.addParticipant(MEETING_UUID, 'socket-2', fakeUser2);

      const participants = service.getParticipants(MEETING_UUID);

      expect(participants).toHaveLength(2);
      expect(participants.map((p) => p.userId)).toEqual(
        expect.arrayContaining(['user-1', 'user-2']),
      );
    });
  });

  // ── getSocketRooms ────────────────────────────────────────────────────

  describe('getSocketRooms', () => {
    it('should return an empty Set for an unknown socket', () => {
      const rooms = service.getSocketRooms('ghost-socket');
      expect(rooms).toBeInstanceOf(Set);
      expect(rooms.size).toBe(0);
    });
  });

  // ── isParticipant ─────────────────────────────────────────────────────

  describe('isParticipant', () => {
    it('should return false for a non-existent room', () => {
      expect(service.isParticipant('no-such-room', 'socket-1')).toBe(false);
    });

    it('should return false for a socket not in the room', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser);
      expect(service.isParticipant(MEETING_UUID, 'socket-99')).toBe(false);
    });
  });
});
