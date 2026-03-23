import { SignalingSessionService } from './signaling-session.service';

const MEETING_UUID = '11111111-1111-4111-a111-111111111111';

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
    it('should return a result with correct ParticipantInfo fields', () => {
      const { participant } = service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, true);

      expect(participant.socketId).toBe('socket-1');
      expect(participant.userId).toBe('user-1');
      expect(participant.name).toBe('Alice');
      expect(participant.isHost).toBe(true);
      expect(typeof participant.joinedAt).toBe('number');
    });

    it('should return no evictedSocketId on fresh join', () => {
      const { evictedSocketId } = service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      expect(evictedSocketId).toBeUndefined();
    });

    it('should make isParticipant return true after adding', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      expect(service.isParticipant(MEETING_UUID, 'socket-1')).toBe(true);
    });

    it('should register the meeting in getMeetingIdBySocket for the socket', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      expect(service.getMeetingIdBySocket('socket-1')).toBe(MEETING_UUID);
    });

    it('should track multiple sockets in the same room independently', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, true);
      service.addParticipant(MEETING_UUID, 'socket-2', fakeUser2, false);

      expect(service.isParticipant(MEETING_UUID, 'socket-1')).toBe(true);
      expect(service.isParticipant(MEETING_UUID, 'socket-2')).toBe(true);
    });

    it('should evict the old socket when the same userId joins with a new socket', () => {
      service.addParticipant(MEETING_UUID, 'socket-old', fakeUser, true);
      const { evictedSocketId } = service.addParticipant(
        MEETING_UUID,
        'socket-new',
        fakeUser,
        true,
      );

      expect(evictedSocketId).toBe('socket-old');
      expect(service.isParticipant(MEETING_UUID, 'socket-old')).toBe(false);
      expect(service.isParticipant(MEETING_UUID, 'socket-new')).toBe(true);
      expect(service.getMeetingIdBySocket('socket-old')).toBeUndefined();
      expect(service.getMeetingIdBySocket('socket-new')).toBe(MEETING_UUID);
    });

    it('should correctly set isHost=false for non-host participant', () => {
      const { participant } = service.addParticipant(MEETING_UUID, 'socket-2', fakeUser2, false);
      expect(participant.isHost).toBe(false);
    });
  });

  // ── removeParticipant ────────────────────────────────────────────────

  describe('removeParticipant', () => {
    it('should return undefined for an unknown socketId', () => {
      const result = service.removeParticipant('ghost-socket');
      expect(result).toBeUndefined();
    });

    it('should return { meetingId, participant } on successful removal', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      const result = service.removeParticipant('socket-1');

      expect(result).toBeDefined();
      expect(result!.meetingId).toBe(MEETING_UUID);
      expect(result!.participant.socketId).toBe('socket-1');
      expect(result!.participant.userId).toBe('user-1');
    });

    it('should make isParticipant return false after removing', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      service.removeParticipant('socket-1');

      expect(service.isParticipant(MEETING_UUID, 'socket-1')).toBe(false);
    });

    it('should clean up the room entry when the last participant leaves', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      service.removeParticipant('socket-1');

      expect(service.getParticipants(MEETING_UUID)).toEqual([]);
    });

    it('should clear getMeetingIdBySocket after removal', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      service.removeParticipant('socket-1');

      expect(service.getMeetingIdBySocket('socket-1')).toBeUndefined();
    });

    it('should not remove other participants when one leaves', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, true);
      service.addParticipant(MEETING_UUID, 'socket-2', fakeUser2, false);
      service.removeParticipant('socket-1');

      expect(service.isParticipant(MEETING_UUID, 'socket-2')).toBe(true);
    });
  });

  // ── getParticipants ──────────────────────────────────────────────────

  describe('getParticipants', () => {
    it('should return an empty array for a non-existent room', () => {
      expect(service.getParticipants('no-such-room')).toEqual([]);
    });

    it('should return the correct participants after adding', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, true);
      service.addParticipant(MEETING_UUID, 'socket-2', fakeUser2, false);

      const participants = service.getParticipants(MEETING_UUID);

      expect(participants).toHaveLength(2);
      expect(participants.map((p) => p.userId)).toEqual(
        expect.arrayContaining(['user-1', 'user-2']),
      );
    });
  });

  // ── getMeetingIdBySocket ──────────────────────────────────────────────

  describe('getMeetingIdBySocket', () => {
    it('should return undefined for an unknown socket', () => {
      expect(service.getMeetingIdBySocket('ghost-socket')).toBeUndefined();
    });

    it('should return the meeting id after joining', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      expect(service.getMeetingIdBySocket('socket-1')).toBe(MEETING_UUID);
    });
  });

  // ── addParticipant — media state defaults ────────────────────────────

  describe('addParticipant — media state defaults', () => {
    it('should initialize isVideoEnabled to false', () => {
      const { participant } = service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, true);
      expect(participant.isVideoEnabled).toBe(false);
    });

    it('should initialize isAudioEnabled to false', () => {
      const { participant } = service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, true);
      expect(participant.isAudioEnabled).toBe(false);
    });
  });

  // ── updateMediaState ──────────────────────────────────────────────────

  describe('updateMediaState', () => {
    it('should return undefined for an unknown socketId', () => {
      const result = service.updateMediaState('ghost-socket', true, true);
      expect(result).toBeUndefined();
    });

    it('should return { meetingId, participant } and update video/audio flags', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      const result = service.updateMediaState('socket-1', true, true);

      expect(result).toBeDefined();
      expect(result!.meetingId).toBe(MEETING_UUID);
      expect(result!.participant.isVideoEnabled).toBe(true);
      expect(result!.participant.isAudioEnabled).toBe(true);
    });

    it('should persist updated state in getParticipants', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      service.updateMediaState('socket-1', true, false);

      const [p] = service.getParticipants(MEETING_UUID);
      expect(p.isVideoEnabled).toBe(true);
      expect(p.isAudioEnabled).toBe(false);
    });

    it('should only update the targeted socket, not other participants', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, true);
      service.addParticipant(MEETING_UUID, 'socket-2', fakeUser2, false);
      service.updateMediaState('socket-1', true, true);

      const participants = service.getParticipants(MEETING_UUID);
      const p2 = participants.find((p) => p.socketId === 'socket-2')!;
      expect(p2.isVideoEnabled).toBe(false);
      expect(p2.isAudioEnabled).toBe(false);
    });

    it('should reflect last-write-wins on rapid toggles', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      service.updateMediaState('socket-1', true, true);
      service.updateMediaState('socket-1', false, false);
      service.updateMediaState('socket-1', true, false);

      const result = service.updateMediaState('socket-1', false, true);
      expect(result!.participant.isVideoEnabled).toBe(false);
      expect(result!.participant.isAudioEnabled).toBe(true);
    });
  });

  // ── isParticipant ─────────────────────────────────────────────────────

  describe('isParticipant', () => {
    it('should return false for a non-existent room', () => {
      expect(service.isParticipant('no-such-room', 'socket-1')).toBe(false);
    });

    it('should return false for a socket not in the room', () => {
      service.addParticipant(MEETING_UUID, 'socket-1', fakeUser, false);
      expect(service.isParticipant(MEETING_UUID, 'socket-99')).toBe(false);
    });
  });
});
