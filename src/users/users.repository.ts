import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { User, Prisma, AuthProvider } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByProviderId(providerId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { provider_providerId: { provider: AuthProvider.google, providerId } },
    });
  }

  /**
   * Creates a new OAuth-authenticated user, handling P2002 race conditions
   * by falling back to a lookup when a concurrent request already created the user.
   */
  async createOAuthUser(data: {
    email: string;
    name: string | null;
    providerId: string;
    provider: AuthProvider;
  }): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: null,
          provider: data.provider,
          providerId: data.providerId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Race condition: another request created the user concurrently — return that user.
        const existing = await this.findByEmail(data.email);
        if (!existing) {
          throw new InternalServerErrorException(
            'User creation failed: race condition detected but fallback lookup returned null',
          );
        }
        return existing;
      }
      throw err;
    }
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
