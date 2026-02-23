import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseWithRefreshDto {
  user!: UserResponseDto;
  accessToken!: string;
}
