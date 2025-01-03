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

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('add-cv')
  @UseInterceptors(FileInterceptor('file'))
  addCv(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.userService.updateUserCV(req.user.id, file);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('find-user')
  findOne(@Param('id') id: string, @Req() req) {
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

  @Post('reset-password/')
  resetPassword(@Body() createNewPasswordDto: CreateNewPasswordDto) {
    return this.userService.resetPassword(
      createNewPasswordDto.newPassword,
      createNewPasswordDto.reset_token,
    );
  }
}
