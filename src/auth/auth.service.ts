import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { SlimUser } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) { }

  async validateUser(email: string, pass: string): Promise<SlimUser> {
    const user = await this.userService.findOneByEmail(email);
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

  async sendResetToken(email: string): Promise<{ reset_token: string }> {
    // check email
    await this.userService.findOneByEmail(email);
    // User found
    return {
      reset_token: this.jwtService.sign(
        { email },
        {
          expiresIn: '30m',
        },
      ),
    };
  }

  // Check if reset_token value
  async checkResetToken(reset_token: string): Promise<string> {
    const tokenValidity = await this.jwtService.verifyAsync(reset_token);
    if (!tokenValidity)
      throw new UnauthorizedException('reset_token_not_valid');
    const email = this.jwtService.decode<{ reset_token: string }>(reset_token);
    return email.reset_token;
  }

  async resetPassword(email: string, password: string): Promise<void> {
    const user = await this.userService.findOneByEmail(email);
    const saltOrRounds = 10;

    const passwordHash = await bcrypt.hash(password, saltOrRounds);
    await this.userService.updatePassword(user, passwordHash);
  }
}
