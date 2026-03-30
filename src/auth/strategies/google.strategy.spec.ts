import { UnauthorizedException } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';
import type { GoogleProfile } from './google.strategy';
import { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'google-sub-123',
    displayName: 'Alice Google',
    emails: [{ value: 'alice@gmail.com', verified: true }],
    photos: [{ value: 'https://photo.example.com/alice.jpg' }],
    provider: 'google',
    profileUrl: 'https://profiles.google.com/google-sub-123',
    _raw: '',
    _json: {} as Profile['_json'],
    ...overrides,
  };
}

function makeStrategy(): GoogleStrategy {
  const configService = {
    get: (key: string) => {
      const map: Record<string, string> = {
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
      };
      return map[key];
    },
  } as unknown as ConfigService;

  return new GoogleStrategy(configService);
}

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(() => {
    strategy = makeStrategy();
  });

  describe('validate()', () => {
    it('returns a GoogleProfile on valid profile', (done) => {
      const profile = makeProfile();

      strategy.validate('at', 'rt', profile, (err, user) => {
        expect(err).toBeNull();
        const result = user as GoogleProfile;
        expect(result.email).toBe('alice@gmail.com');
        expect(result.name).toBe('Alice Google');
        expect(result.providerId).toBe('google-sub-123');
        expect(result.picture).toBe('https://photo.example.com/alice.jpg');
        done();
      });
    });

    it('calls done with UnauthorizedException when profile has no email', (done) => {
      const profile = makeProfile({ emails: [] });

      strategy.validate('at', 'rt', profile, (err) => {
        expect(err).toBeInstanceOf(UnauthorizedException);
        done();
      });
    });

    it('handles missing photos gracefully (picture is null)', (done) => {
      const profile = makeProfile({ photos: [] });

      strategy.validate('at', 'rt', profile, (err, user) => {
        expect(err).toBeNull();
        const result = user as GoogleProfile;
        expect(result.picture).toBeNull();
        done();
      });
    });

    it('handles null displayName (name becomes null)', (done) => {
      const profile = makeProfile({ displayName: undefined });

      strategy.validate('at', 'rt', profile, (err, user) => {
        expect(err).toBeNull();
        const result = user as GoogleProfile;
        expect(result.name).toBeNull();
        done();
      });
    });
  });
});
