import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { User } from '@prisma/client';

interface SocketData {
  user?: User;
}

type AuthenticatedSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;
import { UsersRepository } from '../users/users.repository';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SignalingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(socket);

      if (!token) {
        throw new UnauthorizedException('Missing authentication token');
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.usersRepository.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      socket.data.user = user;
      this.logger.log(`Client connected: socketId=${socket.id} userId=${user.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      this.logger.warn(`Connection rejected: socketId=${socket.id} reason=${message}`);
      socket.emit('error', { code: 401, message });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    const userId: string | undefined = socket.data.user?.id;
    this.logger.log(
      `Client disconnected: socketId=${socket.id} userId=${userId ?? 'unauthenticated'}`,
    );
  }

  private extractToken(socket: AuthenticatedSocket): string | undefined {
    const authToken = socket.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const authHeader = socket.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return undefined;
  }
}
