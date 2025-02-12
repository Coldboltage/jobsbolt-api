import { Controller, Request, Post, UseGuards, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AppService } from './app.service';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { Role } from './auth/role.enum';
import {
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { LoginDto } from './app.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly authService: AuthService,
    private readonly appService: AppService,
  ) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Simple test for stress test usage',
  })
  @ApiOkResponse({
    description: 'Got the helloWorld response',
  })
  @ApiBadRequestResponse({
    description: 'Something has went really wrong here!',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  getHello() {
    return this.appService.getHello();
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  @ApiOperation({
    summary: 'Login to your account',
  })
  @ApiOkResponse({
    description: 'User has logged into their account',
  })
  @ApiBadRequestResponse({
    description: 'User was not able to log into their account',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  @ApiBody({ type: LoginDto })
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user);
    res.cookie('jwt', result.access_token, {
      httpOnly: true, // Prevents JavaScript access (more secure)
      // maxAge: 60 * 60 * 1000, // 1 hour
      path: '/', // Cookie available site-wide
    });
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('auth/logout')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout from your account',
  })
  @ApiOkResponse({
    description: 'User has logged out from their account',
  })
  @ApiBadRequestResponse({
    description: 'User was not able to logout',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  logout(@Res() res: Response) {
    res.cookie('jwt', '', {
      httpOnly: true,
      path: '/',
      expires: new Date(0), // Set to a past date to expire the cookie
    });
    res.status(200).send({ message: 'Logged out successfully' });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'A way to see your user info',
    description: 'Previously needed this to see my user info',
  })
  @ApiOkResponse({
    description: 'Found specific user',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  async getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/debug-sentry')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test Sentry',
    description: 'Need this to test sentry',
  })
  @ApiOkResponse({
    description: 'An Error for Sentry has been created',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  getError() {
    throw new Error('My first Sentry error!');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('fullrun')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get Jobsbolt to check for new jobs for each JobType which is active',
    description:
      'This is a manual way to activate Jobsbolt and to find new jobs',
  })
  @ApiOkResponse({
    description: 'Jobsbolt is checking every JobType for new jobs.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  fullRun() {
    return this.appService.fullRun();
  }
}
