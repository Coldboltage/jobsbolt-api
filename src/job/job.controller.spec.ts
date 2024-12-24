import { Test, TestingModule } from '@nestjs/testing';
import { JobController } from './job.controller';
import { createMock } from '@golevelup/ts-jest';
import { JobService } from './job.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Job,
  JobInfoInterface,
  ManualJobInfoInterface,
} from './entities/job.entity';
import { faker } from '@faker-js/faker';
import { JobType } from '../job-type/entities/job-type.entity';
import { CoverLetter } from '../cover-letter/entities/cover-letter.entity';

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
      const addJobsByBotSpy = jest.spyOn(service, 'addJobsByBot');

      // Act
      await controller.byBot('123', {
        jobs: [
          {
            indeedId: '123e4567-e89b-12d3-a456-426614174000', // Example UUIDv4 format
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

  describe('findAllCoverLetterToApply', () => {
    it('should fire the service findAllCoverLetterToApply', async () => {
      // Arrange
      const reqMock = {
        user: {
          id: faker.string.uuid(),
        },
      };
      const findAllCoverLetterToApplySpy = jest.spyOn(
        service,
        'findAllCoverLetterToApply',
      );
      // Act
      await controller.findAllCoverLetterToApply(reqMock);
      // Assert
      expect(findAllCoverLetterToApplySpy).toHaveBeenCalled();
    });

    it('should throw an exception if no cover letter is generated for any job', async () => {
      // Arrange
      const reqMock = {
        user: {
          id: faker.string.uuid(),
        },
      };

      const findAllCoverLetterToApplySpy = jest
        .spyOn(service, 'findAllCoverLetterToApply')
        .mockRejectedValueOnce(new Error('no_cover_letters_ready'));

      // Act
      const result = controller.findAllCoverLetterToApply(reqMock);

      // Assert
      await expect(result).rejects.toThrow('no_cover_letters_ready');
      expect(findAllCoverLetterToApplySpy).toHaveBeenCalled();
    });
  });

  describe('sendDiscordNewJobMessage', () => {
    it('should send a new job discord message', async () => {
      // Arrange
      const sendDiscordNewJobMessageSpy = jest.spyOn(
        service,
        'sendDiscordNewJobMessage',
      );
      // Act
      await controller.sendDiscordNewJobMessage();
      // Assert
      expect(sendDiscordNewJobMessageSpy).toHaveBeenCalled();
    });
  });

  describe('sendDiscordNewJobMessageToUser', () => {
    it('should fire the SendDiscordNewJobMessageToUser', async () => {
      // Arrange
      const mockReq = {
        user: {
          userId: faker.string.uuid(),
        },
      };
      const sendDiscordNewJobMessageToUserSerivceSpy = jest.spyOn(
        service,
        'sendDiscordNewJobMessageToUser',
      );
      // Act
      await controller.sendDiscordNewJobMessageToUser(mockReq);
      // Assert
      expect(sendDiscordNewJobMessageToUserSerivceSpy).toHaveBeenCalled();
      expect(sendDiscordNewJobMessageToUserSerivceSpy).toHaveBeenCalledWith(
        mockreq.user.id,
      );
    });
  });

  describe('findAllJobsNotifiedPendingInterest', () => {
    it('should fire the findAllJobsNotifiedPendingInterest service', async () => {
      // Arrange
      const reqMock = {
        user: {
          userId: faker.string.uuid(),
        },
      };

      const findAllJobsNotifiedPendingInterestSpy = jest.spyOn(
        service,
        'findAllJobsNotifiedPendingInterest',
      );

      // Act
      await controller.findAllJobsNotifiedPendingInterest(reqMock);
      // Assert

      expect(findAllJobsNotifiedPendingInterestSpy).toHaveBeenCalled();
    });
  });

  describe('jobInterestState', () => {
    it('should fire jobInterestState service', async () => {
      // Arrange
      const reqMock = {
        user: {
          userId: faker.string.uuid(),
        },
      };

      const mockJobId = faker.string.uuid();
      const mockInterestedState = true;

      const jobInterestStateSpy = jest
        .spyOn(service, 'jobInterestState')
        .mockResolvedValueOnce(new Job());

      // Act
      const response = await controller.jobInterestState(
        reqMock,
        mockJobId,
        mockInterestedState,
      );

      // Assert
      expect(jobInterestStateSpy).toHaveBeenCalled();
      expect(response instanceof Job).toEqual(true);
    });
  });

  describe('findAllInterestedJobsByUser', () => {
    it('should fire the findAllInterestedJobsByUser service', async () => {
      // Arrange
      const reqMock = {
        user: {
          userId: faker.string.uuid(),
        },
      };

      const findAllInterestedJobsByUserSpy = jest.spyOn(
        service,
        'findAllInterestedJobsByUser',
      );

      // Act
      await controller.findAllInterestedJobsByUser(reqMock);
      // Assert

      expect(findAllInterestedJobsByUserSpy).toHaveBeenCalled();
    });
  });

  describe('addJobManually', () => {
    it('should add a job manually', async () => {
      // Arrange

      const mockJobType = new JobType();
      mockJobType.id = faker.string.uuid();

      const mockJob: ManualJobInfoInterface = {
        indeedId: faker.string.uuid(),
        jobTypeId: mockJobType.id,
        name: faker.person.jobTitle(),
        description: faker.lorem.paragraph(),
        pay: '40000',
        location: faker.location.streetAddress(),
        companyName: faker.company.name(),
        manual: true,
        link: faker.internet.url(),
      };

      const savedMockJob: Job = {
        id: faker.string.uuid(),
        indeedId: mockJob.indeedId,
        applied: false,
        link: mockJob.link,
        name: mockJob.name,
        companyName: mockJob.companyName,
        date: faker.date.anytime(),
        description: mockJob.description,
        pay: mockJob.pay,
        location: mockJob.location,
        summary: null,
        conciseDescription: null,
        conciseSuited: null,
        suited: false,
        suitabilityScore: null,
        jobType: [mockJobType],
        scannedLast: null,
        notification: false,
        interested: false,
        manual: mockJob.manual,
        coverLetter: null,
      };

      // Get the data
      // Send the data

      const saveJobSpy = jest
        .spyOn(service, 'addJobManually')
        .mockResolvedValueOnce(savedMockJob);

      // Act
      const result = await controller.addJobManually(mockJob);
      // Assert
      expect(result).toEqual(savedMockJob);
      expect(saveJobSpy).toHaveBeenCalled();
      expect(saveJobSpy).toHaveBeenCalledWith(mockJob);
    });
  });
});
