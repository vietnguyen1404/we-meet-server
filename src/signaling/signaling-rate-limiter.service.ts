import { Injectable } from '@nestjs/common';

export type SignalingEvent = 'offer' | 'answer' | 'ice-candidate';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

interface RateBucket {
  count: number;
  windowStart: number;
}

const EVENT_LIMITS: Record<SignalingEvent, RateLimitConfig> = {
  offer: { limit: 5, windowMs: 10_000 },
  answer: { limit: 5, windowMs: 10_000 },
  'ice-candidate': { limit: 50, windowMs: 10_000 },
};

@Injectable()
export class SignalingRateLimiterService {
  private readonly buckets = new Map<string, RateBucket>();

  check(socketId: string, event: SignalingEvent): boolean {
    const config = EVENT_LIMITS[event];
    if (!config) return true;
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= config.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= config.limit;
  }

  clearSocket(socketId: string): void {
    const prefix = `${socketId}:`;
    for (const key of Array.from(this.buckets.keys())) {
      if (key.startsWith(prefix)) {
        this.buckets.delete(key);
      }
    }
  }
}
