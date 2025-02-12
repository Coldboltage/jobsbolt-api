import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/role.enum';

@ApiTags('job')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('send-test')
  @ApiOperation({
    summary: 'A simple sent email test',
  })
  @ApiOkResponse({
    description: 'A test email was fired.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  async sendTestEmail(@Body() body: { email: string }) {
    await this.emailService.sendTestEmail(body.email);
    return { message: `Test email sent to ${body.email}` };
  }
}
