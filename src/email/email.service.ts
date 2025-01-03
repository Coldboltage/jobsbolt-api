import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) { }

  async sendTestEmail(to: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Test Email from Jobsbolt',
      text: 'This is a plain text test email sent from Jobsbolt!',
      html: '<p>This is a <strong>test email</strong> sent from Jobsbolt!</p>',
    });
  }
}
