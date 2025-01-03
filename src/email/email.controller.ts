import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) { }

  @Post('send-test')
  async sendTestEmail(@Body() body: { email: string }) {
    await this.emailService.sendTestEmail(body.email);
    return { message: `Test email sent to ${body.email}` };
  }
}
