import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCoverLetterDto {
  @IsUUID()
  indeedId: string;

  @IsString()
  @IsNotEmpty()
  userPitch: string;
}
