import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateNewPasswordDto } from './dto/create-new-password.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CoverLetter } from '../cover-letter/entities/cover-letter.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Role } from './role.enum';
import { Roles } from './roles.decorator';
import { ResetInfo } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('send-reset-token/:email')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a user a password reset request',
    description:
      'The user has to have access to their own email address. So if someone is trying to brute force, they still need that email address',
  })
  @ApiOkResponse({
    description: 'Send reset token to designated email address.',
    type: CoverLetter,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  sendResetToken(@Param('email') email: string) {
    return this.authService.sendResetToken(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('check-reset-token/:jwt')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check authenticity of JWT Token',
    description:
      'The JWT Token has to be signed by Jobsbolt and then after it is confirmed, then we can see what it is. Unless it was signed by us, we do not care',
  })
  @ApiOkResponse({
    description: 'JWT is correct.',
    type: String,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request. The reset token is invalid.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  checkResetToken(@Param('jwt') jwt: string) {
    return this.authService.checkResetToken(jwt);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('reset-password/')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check authenticity of JWT Token',
    description:
      'The JWT Token has to be signed by Jobsbolt and then after it is confirmed, then we can see what it is. Unless it was signed by us, we do not care',
  })
  @ApiOkResponse({
    description: 'JWT is correct.',
    type: ResetInfo,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request. The reset token is invalid.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  resetPassword(@Body() createNewPasswordDto: CreateNewPasswordDto) {
    return this.authService.resetPassword(
      createNewPasswordDto.newPassword,
      createNewPasswordDto.reset_token,
    );
  }
}
