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

// Need to create another DTO which is just for credit and availableJobs using the extends PartialType(CreateUserDto)
// Problem is, users have access to 

//  update(@Req() req, @Body() updateUserDto: UpdateUserDto) {
//     return this.userService.update(req.user.id, updateUserDto);
//   }

// Problematic so we need them to have access to change description, cv and userTalk but they currently could update
// Credit, that is problematic.
