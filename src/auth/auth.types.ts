import { ApiProperty } from '@nestjs/swagger';

export class ResetInfo {
  @ApiProperty()
  email: string;

  @ApiProperty()
  passwordHash: string;
};