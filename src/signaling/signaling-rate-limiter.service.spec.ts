import { SignalingRateLimiterService } from './signaling-rate-limiter.service';
import type { SignalingEvent } from './signaling-rate-limiter.service';

describe('SignalingRateLimiterService', () => {
  let service: SignalingRateLimiterService;

  beforeEach(() => {
    service = new SignalingRateLimiterService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── check ─────────────────────────────────────────────────────────────

  describe('check', () => {
    it('should allow the first event', () => {
      expect(service.check('socket-1', 'offer')).toBe(true);
    });

    it('should allow events up to the offer limit (5)', () => {
      for (let i = 0; i < 5; i++) {
        expect(service.check('socket-1', 'offer')).toBe(true);
      }
    });

    it('should block the 6th offer event within the window', () => {
      for (let i = 0; i < 5; i++) {
        service.check('socket-1', 'offer');
      }
      expect(service.check('socket-1', 'offer')).toBe(false);
    });

    it('should allow events up to the answer limit (5)', () => {
      for (let i = 0; i < 5; i++) {
        expect(service.check('socket-1', 'answer')).toBe(true);
      }
    });

    it('should allow up to 50 ice-candidate events', () => {
      for (let i = 0; i < 50; i++) {
        expect(service.check('socket-1', 'ice-candidate')).toBe(true);
      }
    });

    it('should block the 51st ice-candidate event within the window', () => {
      for (let i = 0; i < 50; i++) {
        service.check('socket-1', 'ice-candidate');
      }
      expect(service.check('socket-1', 'ice-candidate')).toBe(false);
    });

    it('should reset after the window expires', () => {
      for (let i = 0; i < 5; i++) {
        service.check('socket-1', 'offer');
      }
      // Advance time past the 10s window
      jest.advanceTimersByTime(10_001);
      expect(service.check('socket-1', 'offer')).toBe(true);
    });

    it('should track limits independently per event type', () => {
      for (let i = 0; i < 5; i++) {
        service.check('socket-1', 'offer');
      }
      // offer is exhausted but answer is not
      expect(service.check('socket-1', 'offer')).toBe(false);
      expect(service.check('socket-1', 'answer')).toBe(true);
    });

    it('should track limits independently per socket', () => {
      for (let i = 0; i < 5; i++) {
        service.check('socket-1', 'offer');
      }
      // socket-1 is exhausted but socket-2 is not
      expect(service.check('socket-1', 'offer')).toBe(false);
      expect(service.check('socket-2', 'offer')).toBe(true);
    });

    it('should return true for unknown events (passthrough)', () => {
      expect(service.check('socket-1', 'unknown-event' as SignalingEvent)).toBe(true);
    });
  });

  // ── clearSocket ──────────────────────────────────────────────────────

  describe('clearSocket', () => {
    it('should allow events again after clearSocket is called', () => {
      for (let i = 0; i < 5; i++) {
        service.check('socket-1', 'offer');
      }
      expect(service.check('socket-1', 'offer')).toBe(false);

      service.clearSocket('socket-1');

      expect(service.check('socket-1', 'offer')).toBe(true);
    });

    it('should not affect other sockets', () => {
      for (let i = 0; i < 5; i++) {
        service.check('socket-1', 'offer');
        service.check('socket-2', 'offer');
      }
      service.clearSocket('socket-1');

      expect(service.check('socket-1', 'offer')).toBe(true);
      expect(service.check('socket-2', 'offer')).toBe(false);
    });

    it('should clear all event buckets for the socket', () => {
      for (let i = 0; i < 5; i++) {
        service.check('socket-1', 'offer');
        service.check('socket-1', 'answer');
      }
      service.clearSocket('socket-1');

      expect(service.check('socket-1', 'offer')).toBe(true);
      expect(service.check('socket-1', 'answer')).toBe(true);
    });

    it('should not throw when clearing a socket with no buckets', () => {
      expect(() => service.clearSocket('unknown-socket')).not.toThrow();
    });
  });
});
