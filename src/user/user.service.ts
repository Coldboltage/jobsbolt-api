import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { IsNull, MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as pdfParse from 'pdf-parse';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private authService: AuthService,
  ) { }
  async create(createUserDto: CreateUserDto) {
    const saltOrRounds = 10;

    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      saltOrRounds,
    );

    const entity = await this.userRepository.save({
      ...createUserDto,
      password: passwordHash,
      date: new Date(),
    });

    console.log(entity);
    return 'This action adds a new user';
  }

  async findAll() {
    return this.userRepository.find({ relations: {} });
  }

  // Users with unsend jobs with suitabilityScore of 85+
  async findUsersWithUnsendSuitableJobs(): Promise<User[]> {
    return this.userRepository.find({
      relations: {
        jobType: {
          jobs: true,
        },
      },
      where: {
        jobType: {
          active: true,
          jobs: {
            notification: false,
          },
        },
      },
    });
  }

  // Find all unsend jobs.
  async findAllUserUnsendJobs(): Promise<User[]> {
    return this.userRepository.find({
      relations: {
        jobType: {
          jobs: true,
        },
      },
      where: {
        jobType: {
          jobs: {
            suited: true,
            notification: false,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const userEntity = this.userRepository.findOne({
      where: { id },
      relations: {
        jobType: true,
      },
    });

    if (!userEntity) throw new NotFoundException('user_not_found');
    return userEntity;
  }

  async findOneByEmail(email: string): Promise<User> {
    const userEntity = await this.userRepository.findOneBy({ email });
    if (userEntity) {
      return userEntity;
    } else {
      throw new NotFoundException('email_address_not_found');
    }
  }

  async updatePassword(user: User, newPassword: string): Promise<void> {
    user.password = newPassword;
    await this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.userRepository.update({ id }, updateUserDto);
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async updateUserCV(id: string, cv: Express.Multer.File) {
    const userEntity = await this.findOne(id);

    // Define the render_page function (gptCode)
    function render_page(pageData) {
      const render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      };

      return pageData.getTextContent(render_options).then((textContent) => {
        let lastY,
          lastX = 0;
        let text = '';
        for (const item of textContent.items) {
          const xDiff = item.transform[4] - lastX;
          const isSameLine = lastY === item.transform[5];

          if (!isSameLine) {
            text += '\n';
          } else {
            text += ' '; // Insert space regardless of X difference
          }
          text += item.str;
          lastY = item.transform[5];
          lastX = item.transform[4] + item.width;
        }
        return text;
      });
    }

    // Options to pass to pdfParse
    const options = {
      pagerender: render_page,
    };

    const data = await pdfParse(cv.buffer, options);
    userEntity.cv = data.text;

    await this.userRepository.save(userEntity);
  }

  async resetPassword(password: string, reset_token: string) {
    const { passwordHash, email } = await this.authService.resetPassword(
      password,
      reset_token,
    );
    const user = await this.findOneByEmail(email);
    await this.updatePassword(user, passwordHash);
  }

  async findAllUnscannedJobsUsers() {
    return this.userRepository.find({
      relations: {
        jobType: {
          jobs: true,
        },
      },
      where: {
        availableJobs: true,
        credit: MoreThan(2.5),
      },
    });
  }
}
