import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { RefreshTokenService } from './refresh-token.service';
import type { GoogleProfile } from './strategies/google.strategy';
import type { User } from '@prisma/client';

const GOOGLE_PROFILE: GoogleProfile = {
  email: 'alice@gmail.com',
  name: 'Alice Google',
  providerId: 'google-sub-123',
  picture: 'https://photo.example.com/alice.jpg',
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id-1',
    email: 'alice@gmail.com',
    passwordHash: null,
    name: 'Alice Google',
    role: 'USER',
    provider: 'google',
    providerId: 'google-sub-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService.googleLogin()', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findByProviderId' | 'findByEmail' | 'createOAuthUser'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let refreshTokenService: jest.Mocked<Pick<RefreshTokenService, 'createRefreshToken'>>;

  beforeEach(() => {
    usersRepository = {
      findByProviderId: jest.fn(),
      findByEmail: jest.fn(),
      createOAuthUser: jest.fn(),
    };

    jwtService = { sign: jest.fn().mockReturnValue('access-token') };

    refreshTokenService = {
      createRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
    };

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      jwtService as unknown as JwtService,
      refreshTokenService as unknown as RefreshTokenService,
    );
  });

  it('returns tokens for a returning Google user (found by providerId)', async () => {
    const existingUser = makeUser();
    usersRepository.findByProviderId.mockResolvedValue(existingUser);

    const result = await service.googleLogin(GOOGLE_PROFILE);

    expect(usersRepository.findByProviderId).toHaveBeenCalledWith('google-sub-123');
    expect(usersRepository.findByEmail).not.toHaveBeenCalled();
    expect(result.response.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('creates a new user for a first-time Google login', async () => {
    const newUser = makeUser();
    usersRepository.findByProviderId.mockResolvedValue(null);
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.createOAuthUser.mockResolvedValue(newUser);

    const result = await service.googleLogin(GOOGLE_PROFILE);

    expect(usersRepository.createOAuthUser).toHaveBeenCalledWith({
      email: 'alice@gmail.com',
      name: 'Alice Google',
      providerId: 'google-sub-123',
      provider: 'google',
    });
    expect(result.response.accessToken).toBe('access-token');
  });

  it('throws ConflictException when email belongs to a local account', async () => {
    const localUser = makeUser({ provider: 'local', passwordHash: 'hash', providerId: null });
    usersRepository.findByProviderId.mockResolvedValue(null);
    usersRepository.findByEmail.mockResolvedValue(localUser);

    await expect(service.googleLogin(GOOGLE_PROFILE)).rejects.toBeInstanceOf(ConflictException);
  });

  it('propagates errors thrown by createOAuthUser', async () => {
    usersRepository.findByProviderId.mockResolvedValue(null);
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.createOAuthUser.mockRejectedValue(new Error('DB connection failed'));

    await expect(service.googleLogin(GOOGLE_PROFILE)).rejects.toThrow('DB connection failed');
  });
});
