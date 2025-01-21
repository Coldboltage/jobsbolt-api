import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cv?: string;

  @IsOptional()
  @IsString()
  userTalk?: string;

  @IsOptional()
  @IsNumber()
  credit?: number;

  @IsOptional()
  @IsBoolean()
  availableJobs?: boolean;
}
