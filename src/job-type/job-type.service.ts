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
import { User } from '../user/entities/user.entity';
import { ClientProxy } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
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

  @Cron('0 */6 * * *')
  async checkJobCron() {
    await this.checkNewJobs();
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
    }[] = activeJobTypes.map((jobType) => {
      const { id, name, location } = jobType;
      return {
        jobTypeId: id,
        name,
        location,
      };
    });

    console.log(formattedJobTypes);

    for (const job of formattedJobTypes) {
      this.client.emit<{
        jobTypeId: string;
        name: string;
        location: string;
      }>('createJobSearch', job);
    }
  }

  async create(
    createJobTypeDto: CreateJobTypeDto,
    userEntity?: User,
  ): Promise<JobType> {
    if (!userEntity) {
      userEntity = await this.userService.findOne(createJobTypeDto.userId);
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
    return this.jobTypeRepository.find({});
  }

  async findAllSuitableJobs(userId: string) {
    const allSuitedJobs = await this.jobTypeRepository.find({
      relations: {
        user: true,
        jobs: true,
      },
      where: {
        user: {
          id: userId,
        },
        jobs: {
          suited: true,
        },
      },
    });
    // console.log(allSuitedJobs[0].)
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
