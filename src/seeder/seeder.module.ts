import { Module } from '@nestjs/common';
import { UserSeeder } from './seeder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserSeeder],
  exports: [UserSeeder],
})
export class SeederModule { }
