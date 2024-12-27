import { Controller, Request, Post, UseGuards, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AppService } from './app.service';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { Role } from './auth/role.enum';

@Controller()
export class AppController {
  constructor(
    private readonly authService: AuthService,
    private readonly appService: AppService,
  ) { }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req, @Res({ passthrough: true }) res: Response,
  ) {

    const result = await this.authService.login(req.user);
    res.cookie('jwt', result.access_token, {
      httpOnly: true, // Prevents JavaScript access (more secure)
      // maxAge: 60 * 60 * 1000, // 1 hour
      path: '/', // Cookie available site-wide
    });
    return result
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return req.user;
  }

  @Get('/debug-sentry')
  getError() {
    throw new Error('My first Sentry error!');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('fullrun')
  fullRun() {
    return this.appService.fullRun();
  }
}
