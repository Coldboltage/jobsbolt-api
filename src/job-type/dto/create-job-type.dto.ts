import { IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateJobTypeDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsUUID()
  id: string;

  @IsNumber()
  desiredPay: number;

  @IsString()
  description: string;
}
