import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { CreateJobTypeDto } from './dto/create-job-type.dto';
import { UpdateJobTypeDto } from './dto/update-job-type.dto';
import { UserService } from '../user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { JobType } from './entities/job-type.entity';
import { Repository } from 'typeorm';
import { SlimUser, User } from '../user/entities/user.entity';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JobTypeService implements OnApplicationBootstrap {
  constructor(
    private userService: UserService,
    @InjectRepository(JobType) private jobTypeRepository: Repository<JobType>,
    @Inject('JOBS_SERVICE') private client: ClientProxy,
    private configService: ConfigService,
  ) { }

  async onApplicationBootstrap() {
    await this.client.connect();
    const isTest = this.configService.get<string>('general.testJobFind');
    if (isTest === 'true') {
      await this.checkNewJobs();
    }
  }

  private readonly logger = new Logger(UserService.name);

  async checkNewJobs() {
    this.logger.debug('Looking for new job');
    const jobTypes = await this.findAll(); // We want to get all jobTypes

    const activeJobTypes = jobTypes.filter(
      (jobType) => jobType.active === true,
    ); // Filter all jobTypes to only active jobTypes

    const formattedJobTypes: {
      jobTypeId: string;
      name: string;
      location: string;
      firstTime: boolean;
    }[] = activeJobTypes.map((jobType) => {
      const { id, name, location } = jobType;

      let firstTime: boolean;

      jobType.jobs?.length === 0 ? (firstTime = true) : (firstTime = false);

      return {
        jobTypeId: id,
        name,
        location,
        firstTime,
      };
    });

    console.log(formattedJobTypes);

    for (const job of formattedJobTypes) {
      this.client.emit<{
        jobTypeId: string;
        name: string;
        location: string;
        firstTime: boolean;
      }>('createJobSearch', job);
    }
  }

  async create(
    createJobTypeDto: CreateJobTypeDto,
    user: SlimUser,
    userEntity?: User,
  ): Promise<JobType> {
    if (!userEntity) {
      userEntity = await this.userService.findOne(user.id);
    }
    const jobTypeEntity = this.jobTypeRepository.create({
      ...createJobTypeDto,
      user: userEntity,
      date: new Date(),
      active: true,
    });

    const savedEntity = await this.jobTypeRepository.save(jobTypeEntity);
    return savedEntity;
  }

  // async addJobs() {}

  async findAll() {
    return this.jobTypeRepository.find({
      relations: {
        jobs: true,
      },
      where: {},
    });
  }

  async findAllByUser(userId: string) {
    // console.log(userId)
    return this.jobTypeRepository.find({
      relations: {
        user: true,
      },
      where: {
        user: {
          id: userId
        }
      },
    });
  }

  async findAllSuitableJobs(id: string) {
    const allSuitedJobs = await this.jobTypeRepository.find({
      relations: {
        user: true,
        jobs: true,
      },
      where: {
        user: {
          id: id,
        },
        jobs: {
          suited: true,
        },
      },
    });
    const allJobs = allSuitedJobs.flatMap((jobType) => {
      return jobType.jobs;
    });
    return allJobs;
  }

  async findOne(id: string) {
    const jobTypeEntity = await this.jobTypeRepository.findOneBy({ id });
    if (!jobTypeEntity) throw new NotFoundException('jobType_not_found');
    return jobTypeEntity;
  }

  update(id: number, updateJobTypeDto: UpdateJobTypeDto) {
    return `This action updates a #${id} jobType`;
  }

  remove(id: number) {
    return `This action removes a #${id} jobType`;
  }
}
