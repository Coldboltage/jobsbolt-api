import { Test, TestingModule } from '@nestjs/testing';
import { JobTypeController } from './job-type.controller';
import { JobTypeService } from './job-type.service';
import { createMock } from '@golevelup/ts-jest';
import { JobType } from './entities/job-type.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

describe('JobTypeController', () => {
  let controller: JobTypeController;

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
      controllers: [JobTypeController],
      providers: [
        JobTypeService,
        {
          provide: getRepositoryToken(JobType),
          useValue: createMock<Repository<JobType>>(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('amqp://localhost:5672'),
          },
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    controller = module.get<JobTypeController>(JobTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
