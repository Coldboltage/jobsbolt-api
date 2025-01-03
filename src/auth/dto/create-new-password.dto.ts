import { IsEmail, IsJWT, IsStrongPassword } from 'class-validator';

export class CreateNewPasswordDto {
  @IsStrongPassword()
  newPassword: string;
  @IsJWT()
  reset_token: string;
}
