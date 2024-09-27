import { Test, TestingModule } from '@nestjs/testing';
import { JobTypeService } from './job-type.service';
import { createMock } from '@golevelup/ts-jest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobType } from './entities/job-type.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

describe('JobTypeService', () => {
  let service: JobTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClientsModule.registerAsync([
          {
            name: 'JOBS_SERVICE',
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              transport: Transport.RMQ,
              options: {
                urls: [configService.get<string>('rabbitmq')],
                queue: 'jobs_queue',
                queueOptions: {
                  durable: false,
                },
              },
            }),
          },
        ]),
      ],
      providers: [
        JobTypeService,
        {
          provide: getRepositoryToken(JobType),
          useValue: createMock<Repository<JobType>>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<JobTypeService>(JobTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
