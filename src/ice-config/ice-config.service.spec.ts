import { createHmac } from 'crypto';
import { IceConfigService } from './ice-config.service';
import { envSchema } from '../config/env.validation';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://localhost/test',
  CLIENT_ORIGIN: 'http://localhost:5173',
  ACCESS_TOKEN_SECRET: 'a'.repeat(32),
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_SECRET: 'b'.repeat(32),
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
};

function makeService(
  overrides: Record<string, string | number | undefined> = {},
): IceConfigService {
  const configMap: Record<string, string | number | undefined> = { ...BASE_ENV, ...overrides };
  const mockConfigService = {
    get: <T>(key: string): T | undefined => configMap[key] as T | undefined,
  };
  return new IceConfigService(mockConfigService as never);
}

const USER_ID = 'user-uuid-1234';

describe('IceConfigService', () => {
  // ── STUN-only fallback ─────────────────────────────────────────────────

  describe('STUN-only (no TURN configured)', () => {
    it('should return a single STUN entry using the default Google STUN server', () => {
      const service = makeService();
      const servers = service.getIceServers(USER_ID);

      expect(servers).toHaveLength(1);
      expect(servers[0].urls).toBe('stun:stun.l.google.com:19302');
      expect(servers[0].username).toBeUndefined();
      expect(servers[0].credential).toBeUndefined();
    });

    it('should use a custom STUN_URLS value when provided', () => {
      const service = makeService({ STUN_URLS: 'stun:custom.stun.example.com:3478' });
      const servers = service.getIceServers(USER_ID);

      expect(servers[0].urls).toBe('stun:custom.stun.example.com:3478');
    });

    it('should support multiple STUN URLs as comma-separated values', () => {
      const service = makeService({
        STUN_URLS: 'stun:stun1.example.com:3478,stun:stun2.example.com:3478',
      });
      const servers = service.getIceServers(USER_ID);

      expect(servers).toHaveLength(2);
      expect(servers[0].urls).toBe('stun:stun1.example.com:3478');
      expect(servers[1].urls).toBe('stun:stun2.example.com:3478');
    });
  });

  // ── Dynamic credential mode ────────────────────────────────────────────

  describe('Dynamic mode (TURN_SECRET provided)', () => {
    const TURN_SECRET = 'super-secret-turn-key-1234';
    const TURN_URLS = 'turn:turn.example.com:3478';

    let service: IceConfigService;

    beforeEach(() => {
      service = makeService({ TURN_URLS, TURN_SECRET });
    });

    it('should include the STUN entry plus one TURN entry', () => {
      const servers = service.getIceServers(USER_ID);
      expect(servers).toHaveLength(2);
    });

    it('should format the username as "<expiry>:<userId>"', () => {
      const before = Math.floor(Date.now() / 1000);
      const servers = service.getIceServers(USER_ID);
      const after = Math.floor(Date.now() / 1000);

      const [, expiry] = servers[1].username!.split(':').map((s, i) => (i === 0 ? Number(s) : s));
      const expiryNum = Number(servers[1].username!.split(':')[0]);

      expect(expiryNum).toBeGreaterThanOrEqual(before + 3600);
      expect(expiryNum).toBeLessThanOrEqual(after + 3600);
      expect(servers[1].username).toContain(`:${USER_ID}`);
      void expiry; // suppress unused variable warning
    });

    it('should produce the correct HMAC-SHA1 credential', () => {
      const servers = service.getIceServers(USER_ID);
      const { username, credential } = servers[1];

      const expected = createHmac('sha1', TURN_SECRET).update(username!).digest('base64');
      expect(credential).toBe(expected);
    });

    it('should use the default TTL of 3600 seconds', () => {
      const before = Math.floor(Date.now() / 1000);
      const servers = service.getIceServers(USER_ID);
      const expiryNum = Number(servers[1].username!.split(':')[0]);
      const after = Math.floor(Date.now() / 1000);

      expect(expiryNum - before).toBeGreaterThanOrEqual(3600);
      expect(expiryNum - after).toBeLessThanOrEqual(3600);
    });

    it('should honour a custom TURN_CREDENTIAL_TTL_SECONDS', () => {
      const customService = makeService({
        TURN_URLS,
        TURN_SECRET,
        TURN_CREDENTIAL_TTL_SECONDS: 7200,
      });
      const before = Math.floor(Date.now() / 1000);
      const servers = customService.getIceServers(USER_ID);
      const expiryNum = Number(servers[1].username!.split(':')[0]);
      const after = Math.floor(Date.now() / 1000);

      expect(expiryNum - before).toBeGreaterThanOrEqual(7200);
      expect(expiryNum - after).toBeLessThanOrEqual(7200);
    });

    it('should produce one TURN entry per URL for multiple TURN_URLS', () => {
      const multiService = makeService({
        TURN_URLS: 'turn:turn.example.com:3478,turns:turn.example.com:5349',
        TURN_SECRET,
      });
      const servers = multiService.getIceServers(USER_ID);
      // 1 STUN + 2 TURN
      expect(servers).toHaveLength(3);
      expect(servers[1].urls).toBe('turn:turn.example.com:3478');
      expect(servers[2].urls).toBe('turns:turn.example.com:5349');
    });

    it('should generate different credentials for different users', () => {
      const servers1 = service.getIceServers('user-a');
      const servers2 = service.getIceServers('user-b');

      expect(servers1[1].credential).not.toBe(servers2[1].credential);
    });
  });

  // ── Static credential mode ─────────────────────────────────────────────

  describe('Static mode (TURN_USERNAME + TURN_PASSWORD provided)', () => {
    const TURN_URLS = 'turn:turn.example.com:3478';
    const TURN_USERNAME = 'static-user';
    const TURN_PASSWORD = 'static-pass';

    let service: IceConfigService;

    beforeEach(() => {
      service = makeService({ TURN_URLS, TURN_USERNAME, TURN_PASSWORD });
    });

    it('should include the STUN entry plus one TURN entry', () => {
      const servers = service.getIceServers(USER_ID);
      expect(servers).toHaveLength(2);
    });

    it('should use the configured static username', () => {
      const servers = service.getIceServers(USER_ID);
      expect(servers[1].username).toBe(TURN_USERNAME);
    });

    it('should use the configured static password as credential', () => {
      const servers = service.getIceServers(USER_ID);
      expect(servers[1].credential).toBe(TURN_PASSWORD);
    });

    it('should return the same credentials regardless of userId', () => {
      const a = service.getIceServers('user-a');
      const b = service.getIceServers('user-b');

      expect(a[1].username).toBe(b[1].username);
      expect(a[1].credential).toBe(b[1].credential);
    });

    it('should prefer dynamic mode over static when TURN_SECRET is also set', () => {
      const mixed = makeService({
        TURN_URLS,
        TURN_USERNAME,
        TURN_PASSWORD,
        TURN_SECRET: 'a'.repeat(16),
      });
      const servers = mixed.getIceServers(USER_ID);
      // Dynamic username contains ":"
      expect(servers[1].username).not.toBe(TURN_USERNAME);
    });
  });

  // ── Env validation superRefine ─────────────────────────────────────────

  describe('Env validation — TURN partial config', () => {
    it('should throw when TURN_URLS is set but no credentials are provided', () => {
      expect(() =>
        envSchema.parse({
          ...BASE_ENV,
          TURN_URLS: 'turn:turn.example.com:3478',
        }),
      ).toThrow();
    });

    it('should pass when TURN_URLS + TURN_SECRET are both set', () => {
      expect(() =>
        envSchema.parse({
          ...BASE_ENV,
          TURN_URLS: 'turn:turn.example.com:3478',
          TURN_SECRET: 'a'.repeat(16),
        }),
      ).not.toThrow();
    });

    it('should pass when TURN_URLS + TURN_USERNAME + TURN_PASSWORD are all set', () => {
      expect(() =>
        envSchema.parse({
          ...BASE_ENV,
          TURN_URLS: 'turn:turn.example.com:3478',
          TURN_USERNAME: 'user',
          TURN_PASSWORD: 'pass',
        }),
      ).not.toThrow();
    });

    it('should pass when TURN_URLS is absent (no TURN configured)', () => {
      expect(() => envSchema.parse({ ...BASE_ENV })).not.toThrow();
    });

    it('should fail when TURN_URLS is set and only TURN_USERNAME (no TURN_PASSWORD) is provided', () => {
      expect(() =>
        envSchema.parse({
          ...BASE_ENV,
          TURN_URLS: 'turn:turn.example.com:3478',
          TURN_USERNAME: 'user',
        }),
      ).toThrow();
    });
  });
});
