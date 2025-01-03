import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { SlimUser } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { AuthUserUtilService } from '../auth-user-util/auth-user-util.service';

@Injectable()
export class AuthService {
  constructor(
    private authUserUtilService: AuthUserUtilService,
    private jwtService: JwtService,
    private emailService: EmailService
  ) { }

  async validateUser(email: string, pass: string): Promise<SlimUser> {
    const user = await this.authUserUtilService.findOneByEmail(email);
    const passwordMatch = await bcrypt.compare(pass, user.password);

    if (user && passwordMatch) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return {
        id: user.id,
        email: user.email,
        roles: user.roles,
        date: user.date,
        name: user.name,
      };
    }
    return null;
  }

  async login(user: SlimUser) {
    const payload = {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async sendResetToken(email: string): Promise<void> {
    // check email
    await this.authUserUtilService.findOneByEmail(email);
    const token = {
      reset_token: this.jwtService.sign(
        { email },
        {
          expiresIn: '60m',
        },
      ),
    }

    await this.emailService.restPasswordLink(email, token.reset_token)
    // User found
    // Email user
  }

  // Check if reset_token value
  async checkResetToken(reset_token: string): Promise<string> {
    const tokenValidity = await this.jwtService.verifyAsync(reset_token);
    if (!tokenValidity)
      throw new UnauthorizedException('reset_token_not_valid');
    const { email } = this.jwtService.decode<{ email: string }>(reset_token);
    return email;
  }

  async resetPassword(
    password: string,
    reset_token: string,
  ): Promise<{ email: string, passwordHash: string }> {
    await this.checkResetToken(reset_token);
    const { email } = this.jwtService.decode(reset_token)
    const saltOrRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltOrRounds);
    return { email, passwordHash }
  }
}
