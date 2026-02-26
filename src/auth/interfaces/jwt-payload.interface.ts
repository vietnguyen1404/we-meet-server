import { UserRole } from '@prisma/client';

/**
 * JWT Payload Interface
 *
 * Defines the structure of data encoded in access tokens.
 * Keep minimal - only include data needed for authentication/authorization.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}
