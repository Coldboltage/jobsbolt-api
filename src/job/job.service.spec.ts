import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import { createMock } from '@golevelup/ts-jest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  ChatCompletionMessage,
  CompleteJobParse,
  IndividualJobFromBatch,
  IndividualJobFromBatchChoice,
  IndividualJobFromBatchResponse,
  IndividualJobFromBatchResponseBody,
  Job,
  JobInfoInterface,
  JobJson,
  ParsedJobContent,
} from './entities/job.entity';
import { ConfigService } from '@nestjs/config';
import { BatchService } from '../batch/batch.service';
import { BatchStatusEnum, BatchType } from '../batch/entity/batch.entity';
import { faker } from '@faker-js/faker';
import { JobTypeService } from '../job-type/job-type.service';
import { JobType } from '../job-type/entities/job-type.entity';
import { PayUnits } from '../job-type/types';
import { User } from '../user/entities/user.entity';
import OpenAI from 'openai';
import { Role } from '../auth/role.enum';
import * as fs from 'fs/promises'; // Import from 'fs/promises' for async/await usage
import { UserService } from '../user/user.service';
import { DiscordService } from '../discord/discord.service';
import { CoverLetter } from '../cover-letter/entities/cover-letter.entity';
import { UtilsService } from '../utils/utils.service';

const path = require('path');

// Manually mock the OpenAI class
jest.mock('openai', () => {
  // Return an object with the constructor and mock methods
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        files: {
          create: mockCreate,
        },
        batches: {
          create: mockBatchesCreate,
        },
      };
    }),
  };
});

// Create mock instances
const mockCreate = jest.fn();
const mockBatchesCreate = jest.fn();

describe('JobService', () => {
  let service: JobService;
  let configService: ConfigService;
  let batchService: BatchService;
  let jobTypeService: JobTypeService;
  let jobRepository: Repository<Job>;
  let userService: UserService;
  let discordService: DiscordService;
  let utilsService: UtilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: getRepositoryToken(Job),
          useValue: createMock<Repository<Job>>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<JobService>(JobService);
    configService = module.get<ConfigService>(ConfigService);
    batchService = module.get<BatchService>(BatchService);
    jobTypeService = module.get<JobTypeService>(JobTypeService);
    jobRepository = module.get<Repository<Job>>(getRepositoryToken(Job));
    userService = module.get<UserService>(UserService);
    discordService = module.get<DiscordService>(DiscordService);
    utilsService = module.get<UtilsService>(UtilsService);
  });

  const createFullUserWithDetails = () => {
    const mockindeedId = '123';
    const mockJob: Job = {
      id: faker.string.uuid(),
      indeedId: mockindeedId,
      applied: false,
      link: `https://www.indeed.com/viewjob?jk=${mockindeedId}`,
      name: faker.person.jobTitle(),
      companyName: faker.company.name(),
      date: new Date(),
      description: faker.person.jobDescriptor(),
      pay: String(faker.helpers.rangeToNumber({ min: 15, max: 100 })),
      location: faker.location.city(),
      summary: null,
      conciseDescription: null,
      conciseSuited: null,
      suited: false,
      jobType: null,
      scannedLast: null,
      notification: false,
      coverLetter: new CoverLetter(),
    };

    const mockJobTypeEntity: JobType = {
      id: faker.string.uuid(),
      name: faker.person.jobTitle(),
      location: faker.location.city(),
      user: null,
      jobs: [mockJob],
      date: undefined,
      active: false,
      desiredPay: 0,
      desiredPayUnit: PayUnits.MONTHLY,
      description: '',
    };

    const mockUser: User = {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      date: new Date(),
      cv: faker.lorem.lines(),
      discordId: faker.internet.userName(),
      description: faker.lorem.lines(),
      roles: [Role.USER],
      jobType: [mockJobTypeEntity],
      baseCoverLetter: faker.lorem.paragraph(),
      userTalk: faker.lorem.paragraph(),
    };

    mockJob.jobType = [mockJobTypeEntity];
    mockJobTypeEntity.user = mockUser;

    return { mockUser, mockJobTypeEntity, mockJob };
  };

  // const createMockJsonLayout = (mockJob: Job): JobJson => {
  //   return {
  //     custom_id: mockJob.indeedId,
  //     method: 'POST',
  //     url: '/v1/chat/completions',
  //     body: {
  //       model: 'gpt-4o-2024-08-06',
  //       messages: [
  //         {
  //           role: 'system',
  //           content:
  //             'You are a helpful and experienced career advisor. Your task is to analyze job descriptions and compare them with candidate resumes. Provide feedback on how well the candidate fits the job, identify key strengths and gaps, and give a recommendation on whether the job is a good match for the candidate.',
  //         },
  //         { role: 'user', content: expect.any(String) },
  //       ],
  //       response_format: {
  //         type: 'json_schema',
  //         json_schema: {
  //           name: 'job_analysis_schema',
  //           strict: true,
  //           schema: {
  //             type: 'object',
  //             properties: {
  //               analysis: {
  //                 type: 'string',
  //                 description:
  //                   'The analysis of how well the candidate fits the job description. This should consider both current qualifications and potential for growth. Location matters a lot. If the job requires to move continent, that might be problematic. See the user description if provided.',
  //               },
  //               is_suitable: {
  //                 type: 'boolean',
  //                 description:
  //                   'A boolean indicating if the candidate is a good match for the job, based on the analysis provided.',
  //               },
  //               conciseDescription: {
  //                 type: 'string',
  //                 description: ` Please format the job descrption, job pay and job location, into a very concise Discord embed message using emojis in Markdown. Include the job title, company name, location, salary range, a brief description of the role, key responsibilities, benefits, and any important notes. Use emojis that fit the context. Use the following format, don't tell me you've made it concise, just give me the message:.`,
  //               },
  //               conciseSuited: {
  //                 type: 'string',
  //                 description: `Using the analysis and is_suited in a very concise way, explain why you feel they were suited.`,
  //               },
  //             },
  //             required: [
  //               'analysis',
  //               'is_suitable',
  //               'conciseDescription',
  //               'conciseSuited',
  //             ],
  //             additionalProperties: false,
  //           },
  //         },
  //       },
  //       max_tokens: 1000,
  //     },
  //   };
  // };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should send a discord message', async () => {
      // Arrange
      jest.spyOn(configService, 'get').mockReturnValueOnce('false');
      jest.spyOn(configService, 'get').mockReturnValueOnce('true');

      const createBatchJobSpy = jest.spyOn(service, 'createBatchJob');
      const sendDiscordNewJobMessageSpy = jest
        .spyOn(service, 'sendDiscordNewJobMessage')
        .mockResolvedValueOnce(undefined);

      // Act
      await service.onApplicationBootstrap();

      // Assert
      expect(createBatchJobSpy).not.toHaveBeenCalled();
      expect(sendDiscordNewJobMessageSpy).toHaveBeenCalled();
    });

    it('should execute a batch job', async () => {
      // Arrange
      jest.spyOn(configService, 'get').mockReturnValueOnce('true');
      jest.spyOn(configService, 'get').mockReturnValueOnce('false');

      const createBatchJobSpy = jest
        .spyOn(service, 'createBatchJob')
        .mockResolvedValueOnce(undefined);
      const sendDiscordNewJobMessageSpy = jest
        .spyOn(service, 'sendDiscordNewJobMessage')
        .mockResolvedValueOnce(undefined);

      // Act
      await service.onApplicationBootstrap();

      // Assert
      expect(createBatchJobSpy).toHaveBeenCalled();
      expect(sendDiscordNewJobMessageSpy).not.toHaveBeenCalled();
    });

    it('should not run any functionality if both tests set to false', async () => {
      // Arrange
      jest.spyOn(configService, 'get').mockReturnValueOnce('false');
      jest.spyOn(configService, 'get').mockReturnValueOnce('false');

      const createBatchJobSpy = jest
        .spyOn(service, 'createBatchJob')
        .mockResolvedValueOnce(undefined);
      const sendDiscordNewJobMessageSpy = jest
        .spyOn(service, 'sendDiscordNewJobMessage')
        .mockResolvedValueOnce(undefined);

      // Act
      await service.onApplicationBootstrap();

      // Assert
      expect(createBatchJobSpy).not.toHaveBeenCalled();
      expect(sendDiscordNewJobMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('createBatchJob', () => {
    it('should not execute anything after scanAvailableJobs', async () => {
      // Arrange
      const scanAvailableJobsSpy = jest
        .spyOn(service, 'scanAvailableJobs')
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.createBatchJob();
      // Assert
      expect(scanAvailableJobsSpy).toHaveBeenCalled();
      expect(result).toEqual(null);
    });

    it('should execute batchsService.create', async () => {
      // Arrange
      const mockNewJob: Job = new Job();
      const mockNewJobsList: Job[] = [mockNewJob];

      const scanAvailableJobsSpy = jest
        .spyOn(service, 'scanAvailableJobs')
        .mockResolvedValueOnce(mockNewJobsList);

      const mockBuffer = Buffer.from('some test data');

      const buildJobJsonSpy = jest
        .spyOn(utilsService, 'buildJsonLd')
        .mockResolvedValueOnce(mockBuffer);

      const mockBatch: OpenAI.Batches.Batch = {
        id: '',
        completion_window: '',
        created_at: 0,
        endpoint: '',
        input_file_id: '',
        object: 'batch',
        status: 'completed',
      };

      const openAISendJSONSpy = jest
        .spyOn(utilsService, 'openAISendJSON')
        .mockResolvedValueOnce(mockBatch);
      const batchServiceCreateSpy = jest.spyOn(batchService, 'create');

      // Act
      await service.createBatchJob();
      // Assert
      expect(scanAvailableJobsSpy).toHaveBeenCalled();
      expect(buildJobJsonSpy).toHaveBeenCalled();
      expect(openAISendJSONSpy).toHaveBeenCalled();
      expect(openAISendJSONSpy).toHaveBeenCalledWith('job');
      expect(batchServiceCreateSpy).toHaveBeenCalled();
      expect(batchServiceCreateSpy).toHaveBeenCalledWith({
        id: mockBatch.id,
        status: BatchStatusEnum.VALIDATING,
        filename: mockBatch.input_file_id,
        type: BatchType.JOB,
      });
    });
  });

  // describe('checkBatches', () => {
  //   it('do not do anything', async () => {
  //     // Arrange
  //     const mockAllResponses = undefined;
  //     const checkPendingBatchesSpy = jest
  //       .spyOn(batchService, 'checkPendingBatches')
  //       .mockResolvedValueOnce(mockAllResponses);

  //     const processJobObjectSpy = jest.spyOn(service, 'processJobObject');

  //     const updateFromCompleteJobParsetSpy = jest
  //       .spyOn(service, 'updateFromCompleteJobParse')
  //       .mockResolvedValueOnce(undefined);

  //     const sendDiscordNewJobMessageSpy = jest.spyOn(
  //       service,
  //       'sendDiscordNewJobMessage',
  //     );
  //     // Act
  //     await service.checkBatches();

  //     // Assert
  //     expect(checkPendingBatchesSpy).toHaveBeenCalled();
  //     expect(processJobObjectSpy).not.toHaveBeenCalled();
  //     expect(updateFromCompleteJobParsetSpy).not.toHaveBeenCalled();
  //     expect(sendDiscordNewJobMessageSpy).not.toHaveBeenCalled();
  //   });

  //   it('should update a job from a batch and call Discord Message', async () => {
  //     // Arrange
  //     const mockAllResponses: IndividualJobFromBatch = {
  //       id: '',
  //       custom_id: '',
  //       response: undefined,
  //       error: undefined,
  //     };

  //     const checkPendingBatchesSpy = jest
  //       .spyOn(batchService, 'checkPendingBatches')
  //       .mockResolvedValueOnce([mockAllResponses]);

  //     const mockCompleteJob: CompleteJobParse = {
  //       indeedId: '',
  //       summary: '',
  //       suited: false,
  //       conciseDescription: '',
  //       conciseSuited: '',
  //     };

  //     const processJobObjectSpy = jest
  //       .spyOn(service, 'processJobObject')
  //       .mockReturnValue(mockCompleteJob);

  //     const updateFromCompleteJobParsetSpy = jest
  //       .spyOn(service, 'updateFromCompleteJobParse')
  //       .mockResolvedValueOnce(undefined);

  //     const sendDiscordNewJobMessageSpy = jest
  //       .spyOn(service, 'sendDiscordNewJobMessage')
  //       .mockResolvedValueOnce(undefined);

  //     // Act
  //     await service.checkBatches();

  //     // Assert
  //     expect(checkPendingBatchesSpy).toHaveBeenCalled();
  //     expect(processJobObjectSpy).toHaveBeenCalled();
  //     expect(updateFromCompleteJobParsetSpy).toHaveBeenCalled();
  //     expect(sendDiscordNewJobMessageSpy).toHaveBeenCalled();
  //   });
  // });

  describe('processJobObject', () => {
    const createMockContent = (state: boolean): ParsedJobContent => {
      return {
        analysis: '',
        is_suitable: state,
        conciseDescription: '',
        conciseSuited: '',
      };
    };

    const createMockJob = (state: boolean): IndividualJobFromBatch => {
      const mockContent = createMockContent(state);

      const mockMessage: ChatCompletionMessage = {
        role: '',
        content: JSON.stringify(mockContent),
      };

      const mockChoice: IndividualJobFromBatchChoice = {
        index: 0,
        message: mockMessage,
      };

      const bodyMock: IndividualJobFromBatchResponseBody = {
        id: '',
        object: '',
        created: 0,
        model: '',
        choices: [mockChoice],
      };

      const mockResponse: IndividualJobFromBatchResponse = {
        status_code: 0,
        request_id: '',
        body: bodyMock,
      };

      return {
        id: faker.string.uuid(),
        custom_id: faker.string.uuid(),
        response: mockResponse,
        error: undefined,
      };
    };

    it('should process the Batch Job Input with false suited', () => {
      // Arrange
      const mockJob = createMockJob(false);

      const mockContent = JSON.parse(
        mockJob.response.body.choices[0].message.content,
      );

      const answer: CompleteJobParse = {
        indeedId: mockJob.custom_id,
        summary: mockContent.analysis,
        suited: mockContent.is_suitable,
        conciseDescription: mockContent.conciseDescription,
        conciseSuited: mockContent.conciseSuited,
      };
      // Act
      const response = service.processJobObject(mockJob);
      // Assert
      expect(response).toEqual(answer);
    });

    it('should process the Batch Job Input with true suited', () => {
      // Arrange
      const jobSuitedState = true;
      const mockJob = createMockJob(jobSuitedState);

      const mockContent = JSON.parse(
        mockJob.response.body.choices[0].message.content,
      );

      const answer: CompleteJobParse = {
        indeedId: mockJob.custom_id,
        summary: mockContent.analysis,
        suited: jobSuitedState,
        conciseDescription: mockContent.conciseDescription,
        conciseSuited: mockContent.conciseSuited,
      };
      // Act
      const response = service.processJobObject(mockJob);
      // Assert
      expect(response).toEqual(answer);
    });
  });

  describe('addJobsByBot', () => {
    const { mockJob, mockJobTypeEntity } = createFullUserWithDetails();
    // const mockJobTypeId = faker.string.uuid();
    // const mockJobTypeEntity: JobType = {
    //   id: '',
    //   name: '',
    //   location: '',
    //   user: new User(),
    //   jobs: [],
    //   date: undefined,
    //   active: false,
    //   desiredPay: 0,
    //   desiredPayUnit: PayUnits.MONTHLY,
    //   description: '',
    // };
    const mockJobInfo: JobInfoInterface = {
      indeedId: mockJob.indeedId,
      jobTypeId: mockJob.jobType[0].id,
      name: mockJob.name,
      description: mockJob.description,
      pay: mockJob.pay,
      location: mockJob.location,
      companyName: mockJob.companyName,
    };
    // const jobEntity: Job = {
    //   id: faker.string.uuid(),
    //   indeedId: mockJob.indeedId,
    //   applied: false,
    //   link: `https://www.indeed.com/viewjob?jk=${mockJob.indeedId}`,
    //   name: mockJob.name,
    //   companyName: mockJob.companyName,
    //   date: new Date(),
    //   description: mockJob.description,
    //   pay: mockJob.pay,
    //   location: mockJob.location,
    //   summary: null,
    //   conciseDescription: null,
    //   conciseSuited: null,
    //   suited: false,
    //   jobType: [mockJobTypeEntity],
    //   scannedLast: null,
    //   notification: false,
    // };

    it('should add a job', async () => {
      // Arrange
      const jobTypeEntitySpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(mockJobTypeEntity);
      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([]);
      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(mockJob);

      // Act
      await service.addJobsByBot(mockJobTypeEntity.id, [mockJobInfo]);

      // Assert
      expect(jobRepositorySaveSpy).toHaveBeenCalledWith({
        indeedId: mockJobInfo.indeedId,
        link: `https://www.indeed.com/viewjob?jk=${mockJobInfo.indeedId}`,
        name: mockJobInfo.name,
        date: expect.any(Date), // You can use `expect.any(Date)` if the exact date is not crucial
        description: mockJobInfo.description,
        pay: mockJobInfo.pay,
        location: mockJobInfo.location,
        suited: false, // Static value as per your implementation
        jobType: [mockJobTypeEntity], // The jobType entity returned from findOne
        scannedLast: null, // Static value as per your implementation
        companyName: mockJobInfo.companyName,
      });
      expect(jobTypeEntitySpy).toHaveBeenCalled();
      expect(jobRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).toHaveBeenCalledTimes(1);
    });

    it('should push a new jobsType record to the already existing job', async () => {
      // Arrange
      // const { mockJobTypeEntity, mockJob } = createFullUserWithDetails();
      const mockJobInfo: JobInfoInterface = {
        indeedId: mockJob.indeedId,
        jobTypeId: mockJob.jobType[0].id,
        name: mockJob.name,
        description: mockJob.description,
        pay: mockJob.pay,
        location: mockJob.location,
        companyName: mockJob.companyName,
      };

      const newUnusedMockJobTypeEntity: JobType = {
        id: 'rawr',
        name: '',
        location: '',
        user: new User(),
        jobs: [mockJob],
        date: undefined,
        active: false,
        desiredPay: 0,
        desiredPayUnit: PayUnits.HOURLY,
        description: '',
      };

      const jobTypeEntityFindOneSpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(new JobType());
      const jobsRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([mockJob]); // This reps all that match

      const updatedMockJob = structuredClone(mockJob);

      // Modify the deep copy without affecting the original mockJob
      updatedMockJob.jobType.push(newUnusedMockJobTypeEntity);

      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(updatedMockJob);

      // Act
      await service.addJobsByBot(newUnusedMockJobTypeEntity.id, [mockJobInfo]);

      // Assert
      // expect(jobRepositorySaveSpy).toHaveBeenCalledWith(updatedMockJob);
      expect(jobTypeEntityFindOneSpy).toHaveBeenCalled();
      expect(jobsRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).toHaveBeenCalled();
    });

    it('should not add a new job as the job already exists', async () => {
      // Arrange
      const existingJobEntity: Job = {
        id: '',
        indeedId: mockJob.indeedId,
        applied: false,
        link: '',
        name: '',
        companyName: '',
        date: undefined,
        description: '',
        pay: '',
        location: '',
        summary: '',
        conciseDescription: '',
        conciseSuited: '',
        suited: false,
        jobType: [mockJobTypeEntity],
        scannedLast: undefined,
        notification: false,
        coverLetter: new CoverLetter(),
      };

      const jobTypeEntitySpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(mockJobTypeEntity);
      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([existingJobEntity]);
      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(mockJob);

      // Act
      await service.addJobsByBot(mockJobTypeEntity.id, [mockJobInfo]);

      // Assert
      expect(jobTypeEntitySpy).toHaveBeenCalled();
      expect(jobRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).not.toHaveBeenCalled();
    });
  });

  describe('scanAvailableJobs', () => {
    const mockindeedId = faker.string.uuid();
    const mockJobTypeEntity: JobType = {
      id: '',
      name: '',
      location: '',
      user: new User(),
      jobs: [],
      date: undefined,
      active: false,
      desiredPay: 0,
      desiredPayUnit: PayUnits.MONTHLY,
      description: '',
    };

    const jobEntity: Job = {
      id: faker.string.uuid(),
      indeedId: mockindeedId,
      applied: false,
      link: `https://www.indeed.com/viewjob?jk=${mockindeedId}`,
      name: faker.person.jobTitle(),
      companyName: faker.company.name(),
      date: new Date(),
      description: faker.person.jobDescriptor(),
      pay: String(faker.helpers.rangeToNumber({ min: 15, max: 100 })),
      location: faker.location.city(),
      summary: null,
      conciseDescription: null,
      conciseSuited: null,
      suited: false,
      jobType: [mockJobTypeEntity],
      scannedLast: null,
      notification: false,
      coverLetter: new CoverLetter(),
    };
    it('should find all jobs available for a scan', async () => {
      // Arrange
      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([jobEntity]);
      // Act
      await service.scanAvailableJobs();
      // Assert
      expect(jobRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositoryFindSpy).toHaveBeenCalledWith({
        where: {
          scannedLast: IsNull(),
        },
        relations: {
          jobType: {
            user: true,
          },
        },
      });
    });
  });

  describe('sendDiscordNewJobMessage', () => {
    it('should send job messages to users', async () => {
      // Arrange
      const { mockUser, mockJob } = createFullUserWithDetails();

      mockJob.suited = true;
      mockJob.notification = false;
      mockJob.summary = faker.lorem.paragraphs();
      mockJob.conciseDescription = faker.lorem.paragraph();
      mockJob.conciseSuited = faker.lorem.sentence();

      const findAllUserUnsendJobsSpy = jest
        .spyOn(userService, 'findAllUserUnsendJobs')
        .mockResolvedValueOnce([mockUser]);

      const sendUserNewJobsSpy = jest
        .spyOn(service, 'sendUserNewJobs')
        .mockResolvedValueOnce([mockJob]);

      const discordServiceSendMessageSpy = jest.spyOn(
        discordService,
        'sendMessage',
      );

      // Act
      await service.sendDiscordNewJobMessage();
      // Assert
      expect(findAllUserUnsendJobsSpy).toHaveBeenCalled();
      expect(sendUserNewJobsSpy).toHaveBeenCalled();
      expect(discordServiceSendMessageSpy).toHaveBeenCalled();
    });

    it('should not fire sendUserNewJobs/sendMessage', async () => {
      // Arrange
      const findAllUserUnsendJobsSpy = jest
        .spyOn(userService, 'findAllUserUnsendJobs')
        .mockResolvedValueOnce([]);

      const sendUserNewJobsSpy = jest.spyOn(service, 'sendUserNewJobs');

      const discordServiceSendMessageSpy = jest.spyOn(
        discordService,
        'sendMessage',
      );
      // Act
      await service.sendDiscordNewJobMessage();
      // Assert
      expect(findAllUserUnsendJobsSpy).toHaveBeenCalled();
      expect(sendUserNewJobsSpy).not.toHaveBeenCalled();
      expect(discordServiceSendMessageSpy).not.toHaveBeenCalled();
    });
  });
  describe('findAll', () => {
    it('should fire jobRepository.find with an empty object', async () => {
      // Arrange
      const jobsRepoFindSpy = jest.spyOn(jobRepository, 'find');
      // Act
      await service.findAll();
      // Assert
      expect(jobsRepoFindSpy).toHaveBeenCalled();
      expect(jobsRepoFindSpy).toHaveBeenCalledWith({});
    });
  });

  describe('findAllSuitableJobs', () => {
    it('should find all suitable jobs with the userId', async () => {
      // Arrange
      const { mockUser, mockJob } = createFullUserWithDetails();
      mockJob.suited = true;

      const jobRepoFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([mockJob]);
      // Act
      const response = await service.findAllSuitableJobs(mockUser.id);
      // Assert
      expect(response).toEqual([mockJob]);
      expect(jobRepoFindSpy).toHaveBeenCalled();
      expect(jobRepoFindSpy).toHaveBeenCalledWith({
        relations: {
          jobType: {
            user: true,
          },
        },
        where: {
          jobType: {
            user: {
              id: mockUser.id,
            },
          },
          suited: true,
        },
      });
    });
    it('should call jobRepo but return nothing', async () => {
      // Arrange
      const { mockUser } = createFullUserWithDetails();

      const jobRepoFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([]);

      // Act
      const response = await service.findAllSuitableJobs(mockUser.id);
      // Assert
      expect(response).toEqual([]);
      expect(jobRepoFindSpy).toHaveBeenCalled();
      expect(jobRepoFindSpy).toHaveBeenCalledWith({
        relations: {
          jobType: {
            user: true,
          },
        },
        where: {
          jobType: {
            user: {
              id: mockUser.id,
            },
          },
          suited: true,
        },
      });
    });
  });

  // describe('findAllAppliedJobs', () => {
  //   it('should find all jobs for a user with the correct state', async () => {

  //   })
  // })
});
