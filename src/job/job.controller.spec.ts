import { Test, TestingModule } from '@nestjs/testing';
import { JobController } from './job.controller';
import { createMock } from '@golevelup/ts-jest';
import { JobService } from './job.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { faker } from '@faker-js/faker';

describe('JobController', () => {
  let controller: JobController;
  let service: JobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        {
          provide: getRepositoryToken(Job),
          useValue: createMock<Repository<Job>>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    controller = module.get<JobController>(JobController);
    service = module.get<JobService>(JobService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('byBot', () => {
    it('should test if the service exists', async () => {
      // Arrange
      const addJobsByBotSpy = jest
        .spyOn(service, 'addJobsByBot')
        .mockResolvedValueOnce();

      // Act
      await controller.byBot('123', {
        jobs: [
          {
            jobId: '123e4567-e89b-12d3-a456-426614174000', // Example UUIDv4 format
            jobTypeId: 'abc123',
            name: 'Software Developer',
            description: 'Develop and maintain software applications.',
            pay: '$70,000 - $90,000 per year',
            location: 'New York, NY',
            companyName: 'Tech Solutions Inc.',
          },
        ],
      });

      // Assert
      expect(addJobsByBotSpy).toHaveBeenCalled();
      expect(service.addJobsByBot).toHaveBeenCalled();
    });

    it('should have two guards', () => {
      const guards = Reflect.getMetadata('__guards__', controller.byBot);

      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });
  });

  describe('findAll', () => {
    it('should find every job on Jobsbolt API', async () => {
      // Arrange
      const findAllSpy = jest.spyOn(service, 'findAll');
      // Act
      await controller.findAll();
      // Assert
      expect(findAllSpy).toHaveBeenCalled();
    });

    it('should find all the guards', () => {
      const guards = Reflect.getMetadata('__guards__', controller.byBot);

      console.log(guards);

      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });
  });

  describe('getAllNewJobs', () => {
    it('should find all the new jobs added by the bot which have not been processed for suitability', async () => {
      // Arrange
      const findAllUserUnsendJobsSpy = jest.spyOn(
        service,
        'findAllUserUnsendJobs',
      );
      const reqMock = {
        user: {
          id: faker.string.uuid(),
        },
      };
      // Act
      await controller.getAllNewJobs(reqMock);
      // Assert
      expect(findAllUserUnsendJobsSpy).toHaveBeenCalled();
    });

    it('should find all the guards', () => {
      const guards = Reflect.getMetadata('__guards__', controller.byBot);

      console.log(guards);

      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });
  });

  describe('findAllSuitableJobs', () => {
    it('should find all suitable jobs for user', async () => {
      // Arrange
      const findAllSuitableJobsSpy = jest.spyOn(service, 'findAllSuitableJobs');
      const reqMock = {
        user: {
          id: faker.string.uuid(),
        },
      };
      // Act
      await controller.findAllSuitableJobs(reqMock);
      // Assert
      expect(findAllSuitableJobsSpy).toHaveBeenCalled();
    });

    it('should find all the guards', () => {
      const guards = Reflect.getMetadata('__guards__', controller.byBot);

      console.log(guards);

      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });
  });

  describe('resetFalse', () => {
    it('Reset all jobs for a user', async () => {
      // Arrange
      const resetFalseSpy = jest.spyOn(service, 'resetFalse');
      const reqMock = {
        user: {
          id: faker.string.uuid(),
        },
      };
      // Act
      await controller.resetFalse(reqMock);
      // Assert
      expect(resetFalseSpy).toHaveBeenCalled();
    });

    it('should find all guards', async () => {
      const guards = Reflect.getMetadata('__guards__', controller.resetFalse);

      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });
  });

  describe('findAllAppliedJobs', () => {
    it('should find all jobs for user, which they have either applied for or not with boolean', async () => {
      // Arrange
      const findAllAppliedJobsSpy = jest.spyOn(service, 'findAllAppliedJobs');
      const reqMock = {
        user: {
          id: faker.string.uuid(),
        },
      };
      // Act
      await controller.findAllAppliedJobs(reqMock, true);
      // Assert
      expect(findAllAppliedJobsSpy).toHaveBeenCalled();
    });

    it('should find all guards', async () => {
      const guards = Reflect.getMetadata('__guards__', controller.resetFalse);

      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });
  });

  describe('updateJobApplication', () => {
    it('should change the applied state of a job for a user', async () => {
      // Arrange
      const updateJobApplicationSpy = jest.spyOn(
        service,
        'updateJobApplication',
      );
      const reqMock = {
        user: {
          id: faker.string.uuid(),
        },
      };
      // Act
      await controller.updateJobApplication(
        reqMock,
        faker.datatype.boolean(),
        faker.string.uuid(),
      );
      // Assert
      expect(updateJobApplicationSpy).toHaveBeenCalled();
    });
    it('should find all guards', async () => {
      const guards = Reflect.getMetadata('__guards__', controller.resetFalse);

      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });
  });
});