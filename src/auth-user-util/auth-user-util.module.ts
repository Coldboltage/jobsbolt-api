import { Module } from '@nestjs/common';
import { AuthUserUtilService } from './auth-user-util.service';
import { User } from '../user/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AuthUserUtilService],
  exports: [AuthUserUtilService]
})
export class AuthUserUtilModule { }
