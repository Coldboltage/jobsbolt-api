import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlimUser } from '../user/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: configService.get('secrets.jwtSecret'),
    });
  }

  async validate(payload: SlimUser) {
    if (!payload) {
      throw new UnauthorizedException(
        'Unauthorized. Invalid or missing token.',
      );
    }
    return {
      userId: payload.id,
      username: payload.email,
      roles: payload.roles,
    };
  }
}
