import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { createMock } from '@golevelup/ts-jest';
import { User } from './entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { CoverLetter } from '../cover-letter/entities/cover-letter.entity';
import { JobType } from '../job-type/entities/job-type.entity';
import { PayUnits } from '../job-type/types';
import { Job } from '../job/entities/job.entity';
import { Role } from '../auth/role.enum';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMock<Repository<User>>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  const createFullUserWithDetails = () => {
    const mockindeedId = '123';
    // Create an instance of Job
    const mockJob = new Job();
    mockJob.id = faker.string.uuid();
    mockJob.indeedId = mockindeedId;
    mockJob.applied = false;
    mockJob.link = `https://www.indeed.com/viewjob?jk=${mockindeedId}`;
    mockJob.name = faker.person.jobTitle();
    mockJob.companyName = faker.company.name();
    mockJob.date = new Date();
    mockJob.description = faker.person.jobDescriptor();
    mockJob.pay = String(faker.helpers.rangeToNumber({ min: 15, max: 100 }));
    mockJob.location = faker.location.city();
    mockJob.summary = null;
    mockJob.conciseDescription = null;
    mockJob.conciseSuited = null;
    mockJob.suited = false;
    mockJob.jobType = null;
    mockJob.scannedLast = null;
    mockJob.notification = false;
    mockJob.coverLetter = new CoverLetter();
    mockJob.suitabilityScore = 95;

    // Create an instance of JobType
    const mockJobTypeEntity = new JobType();
    mockJobTypeEntity.id = faker.string.uuid();
    mockJobTypeEntity.name = faker.person.jobTitle();
    mockJobTypeEntity.location = faker.location.city();
    mockJobTypeEntity.user = null;
    mockJobTypeEntity.jobs = [mockJob];
    mockJobTypeEntity.date = undefined;
    mockJobTypeEntity.active = false;
    mockJobTypeEntity.desiredPay = 0;
    mockJobTypeEntity.desiredPayUnit = PayUnits.MONTHLY;
    mockJobTypeEntity.description = '';

    // Create an instance of User
    const mockUser = new User();
    mockUser.id = faker.string.uuid();
    mockUser.name = faker.person.fullName();
    mockUser.email = faker.internet.email();
    mockUser.password = faker.internet.password();
    mockUser.date = new Date();
    mockUser.cv = faker.lorem.lines();
    mockUser.discordId = faker.internet.userName();
    mockUser.description = faker.lorem.lines();
    mockUser.roles = [Role.USER];
    mockUser.jobType = [mockJobTypeEntity];
    mockUser.baseCoverLetter = faker.lorem.paragraph();
    mockUser.userTalk = faker.lorem.paragraph();

    // Create an instance of CoverLetter
    const mockCoverLetter = new CoverLetter();
    mockCoverLetter.id = faker.string.uuid();
    mockCoverLetter.userPitch = faker.lorem.paragraph();
    mockCoverLetter.generatedCoverLetter = faker.lorem.paragraph();
    mockCoverLetter.batch = false;
    mockCoverLetter.job = mockJob;

    // Set relationships
    mockJob.jobType = [mockJobTypeEntity];
    mockJobTypeEntity.user = mockUser;
    mockJob.coverLetter = mockCoverLetter;
    return { mockUser, mockJobTypeEntity, mockJob, mockCoverLetter };
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findUsersWithUnsendSuitableJobs', () => {
    it('should find users with one or more suitable jobs over 85', async () => {
      // Note: This should look for a list of users which have jobs that are suitable for them and have not been notified of them yet

      // Arrange
      const { mockUser } = createFullUserWithDetails();

      const findUsersSpy = jest
        .spyOn(userRepository, 'find')
        .mockResolvedValueOnce([mockUser]);

      // Act
      const response = await service.findUsersWithUnsendSuitableJobs();

      // Assert
      expect(response).toEqual([mockUser]);
      expect([response[0]]).toEqual([mockUser]);
      expect(findUsersSpy).toHaveBeenCalled();
      expect(findUsersSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: {
            jobType: {
              jobs: true,
            },
          },
          where: {
            jobType: expect.objectContaining({
              active: true,
              jobs: expect.objectContaining({
                notification: false,
              }),
            }),
          },
        }),
      );
    });
  });
});
