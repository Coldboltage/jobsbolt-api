import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  username: string;

  @ApiProperty({ example: 'yourpassword' })
  password: string;
}
