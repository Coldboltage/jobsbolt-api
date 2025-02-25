import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  username: string;

  @ApiProperty({ example: 'yourpassword' })
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn' })
  access_token: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message: string;
}

export class SentryErrorDto {
  @ApiProperty({ example: '500' })
  statusCode: number;

  @ApiProperty({ example: 'My first Sentry error!' })
  message: string;
}
