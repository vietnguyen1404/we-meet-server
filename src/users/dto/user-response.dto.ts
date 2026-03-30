import { Exclude, Expose } from 'class-transformer';
import { UserRole, AuthProvider } from '@prisma/client';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  name!: string | null;

  @Expose()
  role!: UserRole;

  @Expose()
  provider!: AuthProvider;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
