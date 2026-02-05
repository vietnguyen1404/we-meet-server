import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.client.user.create({ data });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.client.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.client.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.client.user.delete({
      where: { id },
    });
  }
}
