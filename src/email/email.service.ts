import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService, private configService: ConfigService) { }

  async sendTestEmail(to: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Test Email from Jobsbolt',
      text: 'This is a plain text test email sent from Jobsbolt!',
      html: '<p>This is a <strong>test email</strong> sent from Jobsbolt!</p>',
    });
  }

  async restPasswordLink(to: string, jwt: string) {
    const websiteUrl = this.configService.get('general.websiteUrl')
    const recoveryLink = `${websiteUrl}/reset-password/${jwt}`
    await this.mailerService.sendMail({
      to,
      subject: 'Reset Password: Jobsbolt',
      text: 'To reset your password, please click this link',
      html: `<p>To reset your password. Please click this <a href="${recoveryLink}">link</a></p>`,
    });
    console.log(to)
  }
}
