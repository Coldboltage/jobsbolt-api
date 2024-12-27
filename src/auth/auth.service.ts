import { Injectable } from '@nestjs/common';
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

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findOneByEmail(email);
    const passwordMatch = await bcrypt.compare(pass, user.password);

    if (user && passwordMatch) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: SlimUser) {
    const payload = {
      id: user.id, // Unique identifier
      email: user.email, // Include email if needed
      roles: user.roles, // Include role or permissions if required
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
