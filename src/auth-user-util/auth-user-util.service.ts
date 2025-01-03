import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthUserUtilService {
  constructor(@InjectRepository(User)
  private userRepository: Repository<User>,
  ) {

  }

  async findOneByEmail(email: string): Promise<User> {
    const userEntity = await this.userRepository.findOneBy({ email });
    if (userEntity) {
      return userEntity;
    } else {
      throw new NotFoundException('email_address_not_found');
    }
  }
}
