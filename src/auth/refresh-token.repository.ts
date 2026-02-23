import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RefreshToken } from '@prisma/client';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.create({
      data,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.client.refreshToken.delete({
      where: { tokenHash },
    });
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.prisma.client.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
