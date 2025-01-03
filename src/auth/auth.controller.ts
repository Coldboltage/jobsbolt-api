import { Body, Controller, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateNewPasswordDto } from './dto/create-new-password.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('send-reset-token/:email')
  sendResetToken(@Param('email') email: string) {
    return this.authService.sendResetToken(email);
  }

  @Post('check-reset-token/:jwt')
  checkResetToken(@Param('jwt') jwt: string) {
    return this.authService.checkResetToken(jwt);
  }

  @Post('reset-password/')
  resetPassword(@Body() createNewPasswordDto: CreateNewPasswordDto) {
    return this.authService.resetPassword(
      createNewPasswordDto.newPassword,
      createNewPasswordDto.reset_token,
    );
  }
}
