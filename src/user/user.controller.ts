import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/role.enum';
import { CreateNewPasswordDto } from '../auth/dto/create-new-password.dto';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JobType } from '../job-type/entities/job-type.entity';
import { UpdateResult } from 'typeorm';
import { User } from './entities/user.entity';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'A user creates their own account',
  })
  @ApiOkResponse({
    description: 'User account created',
    type: JobType,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('add-cv')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'A user adds their CV to Jobsbolt for their account',
  })
  @ApiOkResponse({
    description: 'A CV has been added to their account',
    type: JobType,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  addCv(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.userService.updateUserCV(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find every user on Jobsbolt',
  })
  @ApiOkResponse({
    description: 'Every user has been found',
    type: JobType,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findAll() {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Patch()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update User Information',
  })
  @ApiOkResponse({
    description: 'The users information has been updated',
    type: UpdateResult,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  update(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(req.user.id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a user (ADMIN)',
  })
  @ApiOkResponse({
    description: 'The user has been perma deleted',
    type: String,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('find-user')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find a user with their JWT token',
  })
  @ApiOkResponse({
    description: 'The user has been found',
    type: User,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  findOne(@Req() req) {
    return this.userService.findOne(req.user.id);
  }

  // @Post('send-reset-token/:email')
  // sendResetToken(@Param('email') email: string) {
  //   return this.userService.resetUserToken(email);
  // }

  // @Post('check-reset-token/:jwt')
  // checkResetToken(@Param('jwt') jwt: string) {
  //   return this.userService.checkResetToken(jwt);
  // }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('reset-password/')
  @ApiOperation({
    summary: 'Reset User Password',
    description:
      'A user will reset their password but they will have to send both a password and their reset_token. The link to reset token is added to the email, which only the user who has access to said email account, will have access to.',
  })
  @ApiOkResponse({
    description: 'The user has been found',
    type: User,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. User does not have the required role.',
  })
  resetPassword(@Body() createNewPasswordDto: CreateNewPasswordDto) {
    return this.userService.resetPassword(
      createNewPasswordDto.newPassword,
      createNewPasswordDto.reset_token,
    );
  }
}
