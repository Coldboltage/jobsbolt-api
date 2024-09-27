import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCoverLetterDto {
  @IsUUID()
  jobId: string;

  @IsString()
  @IsNotEmpty()
  userPitch: string;
}
