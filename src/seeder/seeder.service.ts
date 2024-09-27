import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { SeedConfig } from '../config/seed/seed.config';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/role.enum';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private configService: ConfigService,
  ) { }

  private userConfig = this.configService.get<SeedConfig>('seed');

  async seed() {
    const isAdmin = await this.userRepository.findOne({
      where: { email: this.userConfig.email },
    });
    if (isAdmin) throw new ConflictException('User already exists');

    // Create the user

    const saltOrRounds = 10;

    const passwordHash = await bcrypt.hash(
      this.userConfig.password,
      saltOrRounds,
    );

    return this.userRepository.save({
      name: this.userConfig.name,
      email: this.userConfig.email,
      password: passwordHash,
      roles: [Role.ADMIN, Role.USER],
      date: new Date(),
    });
  }
}
