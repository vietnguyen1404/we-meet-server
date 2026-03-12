import { IsDefined, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AnswerDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  targetSocketId!: string;

  @IsDefined()
  payload!: unknown;
}
