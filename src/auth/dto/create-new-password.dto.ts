import { IsEmail, IsJWT, IsStrongPassword } from 'class-validator';

export class CreateNewPasswordDto {
  @IsEmail()
  email: string;
  @IsStrongPassword()
  newPassword: string;
  @IsJWT()
  reset_token: string;
}
