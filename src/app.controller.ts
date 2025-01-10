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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('hello-world')
  getHello() {
    return this.appService.getHello();
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user);
    res.cookie('jwt', result.access_token, {
      httpOnly: true, // Prevents JavaScript access (more secure)
      // maxAge: 60 * 60 * 1000, // 1 hour
      path: '/', // Cookie available site-wide
    });
    return result;
  }

  @Post('auth/logout')
  logout(@Res() res: Response) {
    res.cookie('jwt', '', {
      httpOnly: true,
      path: '/',
      expires: new Date(0), // Set to a past date to expire the cookie
    });
    res.status(200).send({ message: 'Logged out successfully' });
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
