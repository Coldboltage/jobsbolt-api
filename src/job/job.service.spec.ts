import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import { createMock } from '@golevelup/ts-jest';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  In,
  IsNull,
  MoreThanOrEqual,
  Not,
  Repository,
  UpdateResult,
} from 'typeorm';
import {
  ChatCompletionMessage,
  CompleteJobParse,
  IndividualJobFromBatch,
  IndividualJobFromBatchChoice,
  IndividualJobFromBatchResponse,
  IndividualJobFromBatchResponseBody,
  Job,
  JobInfoInterface,
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

  afterEach(() => {
    jest.resetAllMocks();
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

  const createMockContent = (state: boolean): ParsedJobContent => {
    return {
      analysis: faker.lorem.sentence(),
      is_suitable: state,
      suitabilityScore: 95,
      conciseDescription: faker.lorem.sentence(),
      conciseSuited: faker.lorem.sentence(),
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
  //   return {
  //     custom_id: mockJob.indeedId,
  //     method: 'POST',
  //     url: '/v1/chat/completions',
  //     body: {
  //       model: 'gpt-4o-2024-11-20',
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
  //                   'A boolean indicating if the candidate is a good match for the job, based on the analysis provided. This should be very strict.',
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
      const isTestSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('false');
      const discordTestSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('true');
      const consoleLogSpy = jest.spyOn(console, 'log');

      const createBatchJobSpy = jest.spyOn(service, 'createBatchJob');
      const sendDiscordNewJobMessageSpy = jest
        .spyOn(service, 'sendDiscordNewJobMessage')
        .mockResolvedValueOnce(undefined);

      // Act
      await service.onApplicationBootstrap();

      // Assert
      expect(isTestSpy).toHaveBeenCalledWith('general.testBatch');
      expect(discordTestSpy).toHaveBeenCalledWith('general.discordTest');
      expect(consoleLogSpy).toHaveBeenCalledWith('discord test activated');
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
      const isTestSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('false');
      const isDiscordTestSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('false');

      const createBatchJobSpy = jest
        .spyOn(service, 'createBatchJob')
        .mockResolvedValueOnce(undefined);
      const sendDiscordNewJobMessageSpy = jest
        .spyOn(service, 'sendDiscordNewJobMessage')
        .mockResolvedValueOnce(undefined);
      const consoleLogSpy = jest.spyOn(console, 'log');

      // Act
      await service.onApplicationBootstrap();

      // Assert
      expect(createBatchJobSpy).not.toHaveBeenCalled();
      expect(sendDiscordNewJobMessageSpy).not.toHaveBeenCalled();
      expect(isTestSpy).toHaveBeenCalledWith('general.testBatch');
      expect(isDiscordTestSpy).toHaveBeenCalledWith('general.discordTest');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('discord test activated');
    });
  });

  describe('createBatchJob', () => {
    it('should not execute anything after scanAvailableJobs', async () => {
      // Arrange

      const scanAvailableJobsSpy = jest
        .spyOn(service, 'scanAvailableJobs')
        .mockResolvedValueOnce([]);

      const jobRepositorySaveSpy = jest.spyOn(jobRepository, 'save');

      // Act
      const result = await service.createBatchJob();
      // Assert
      expect(scanAvailableJobsSpy).toHaveBeenCalled();
      expect(result).toEqual(null);
      expect(jobRepositorySaveSpy).not.toHaveBeenCalled();
    });

    it('should execute batchsService.create', async () => {
      // Arrange
      const mockNewJob: Job = new Job();
      const mockNewJobsList: Job[] = [mockNewJob];

      const updatedMockJob = structuredClone(mockNewJob);
      updatedMockJob.scannedLast = new Date();

      const scanAvailableJobsSpy = jest
        .spyOn(service, 'scanAvailableJobs')
        .mockResolvedValueOnce(mockNewJobsList);

      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce([updatedMockJob] as any);

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
      expect(jobRepositorySaveSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          ...updatedMockJob,
          scannedLast: expect.any(Date), // Allow any valid Date object
        }),
      ]);
      expect(buildJobJsonSpy).toHaveBeenCalledWith([updatedMockJob], 'job');
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
        suitabilityScore: mockContent.suitabilityScore,
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
        suitabilityScore: mockContent.suitabilityScore,
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
    it('should add a job', async () => {
      // Arrange
      const { mockJob, mockJobTypeEntity } = createFullUserWithDetails();
      const mockJobInfo: JobInfoInterface = {
        indeedId: mockJob.indeedId,
        jobTypeId: mockJob.jobType[0].id,
        name: mockJob.name,
        description: mockJob.description,
        pay: mockJob.pay,
        location: mockJob.location,
        companyName: mockJob.companyName,
      };

      const copyJob = structuredClone(mockJob);
      copyJob.indeedId = '1234';
      copyJob.jobType[0].id = 'random';

      const jobTypeEntitySpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(mockJobTypeEntity);
      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([copyJob]);
      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(mockJob);
      const consoleLogSpy = jest.spyOn(console, 'log');

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
      expect(jobTypeEntitySpy).toHaveBeenCalledWith(mockJobTypeEntity.id);
      expect(jobRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositoryFindSpy).toHaveBeenCalledWith({
        where: { indeedId: In([mockJobInfo.indeedId]) },
        relations: {
          jobType: true,
        },
      });
      expect(jobRepositorySaveSpy).toHaveBeenCalledWith({
        indeedId: mockJob.indeedId,
        link: `https://www.indeed.com/viewjob?jk=${mockJob.indeedId}`,
        name: mockJob.name,
        date: expect.any(Date),
        description: mockJob.description,
        pay: mockJob.pay,
        location: mockJob.location,
        suited: false,
        jobType: [mockJobTypeEntity],
        scannedLast: null,
        companyName: mockJob.companyName,
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('array for newJobs'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${mockJob.indeedId} added`),
      );
    });

    it('should not add a new job as the job already', async () => {
      // Arrange
      const { mockJobTypeEntity, mockJob } = createFullUserWithDetails();
      const mockJobInfo: JobInfoInterface = {
        indeedId: mockJob.indeedId,
        jobTypeId: mockJob.jobType[0].id,
        name: mockJob.name,
        description: mockJob.description,
        pay: mockJob.pay,
        location: mockJob.location,
        companyName: mockJob.companyName,
      };

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
        suitabilityScore: 0,
      };

      const existingJobEntityTwo: Job = {
        id: mockJobInfo.indeedId,
        indeedId: 'lawl',
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
        suitabilityScore: 0,
      };

      const jobTypeEntitySpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(mockJobTypeEntity);
      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([existingJobEntity, existingJobEntityTwo]);
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

    it('should push a new jobsType record to the already existing job', async () => {
      // Arrange
      const { mockJob } = createFullUserWithDetails();
      const newUnusedMockJobTypeEntity: JobType = {
        id: 'rawr',
        name: '',
        location: '',
        user: new User(),
        jobs: [],
        date: undefined,
        active: false,
        desiredPay: 0,
        desiredPayUnit: PayUnits.HOURLY,
        description: '',
      };

      const mockJobInfo: JobInfoInterface = {
        indeedId: mockJob.indeedId,
        jobTypeId: newUnusedMockJobTypeEntity.id,
        name: mockJob.name,
        description: mockJob.description,
        pay: mockJob.pay,
        location: mockJob.location,
        companyName: mockJob.companyName,
      };

      const mockJobInfoSameType = structuredClone(mockJobInfo);
      mockJobInfoSameType.jobTypeId = 'random';
      mockJobInfoSameType.indeedId = mockJob.indeedId;

      const jobTypeEntityFindOneSpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(newUnusedMockJobTypeEntity);
      const jobsRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([mockJob]); // This reps all that match

      const updatedExistingJob = structuredClone(mockJob);

      // Modify the deep copy without affecting the original mockJob
      updatedExistingJob.jobType.push(newUnusedMockJobTypeEntity);

      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(updatedExistingJob);

      const consoleLogSpy = jest.spyOn(console, 'log');

      // Act
      await service.addJobsByBot(newUnusedMockJobTypeEntity.id, [
        mockJobInfo,
        mockJobInfoSameType,
      ]);

      // Assert
      expect(jobRepositorySaveSpy).toHaveBeenCalledWith(updatedExistingJob);
      expect(jobTypeEntityFindOneSpy).toHaveBeenCalled();
      expect(jobsRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('adding existing job'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('jobType pushed and updated'),
      );
    });

    it('should not add a new jobType to an existing job with the same jobType', async () => {
      // Arrange
      const { mockJob, mockJobTypeEntity } = createFullUserWithDetails();
      const newUnusedMockJobTypeEntity: JobType = {
        id: 'unusedMockType',
        name: '',
        location: '',
        user: new User(),
        jobs: [],
        date: undefined,
        active: false,
        desiredPay: 0,
        desiredPayUnit: PayUnits.HOURLY,
        description: '',
      };

      const mockJobInfo: JobInfoInterface = {
        indeedId: mockJob.indeedId,
        jobTypeId: mockJob.jobType[0].id,
        name: mockJob.name,
        description: mockJob.description,
        pay: mockJob.pay,
        location: mockJob.location,
        companyName: mockJob.companyName,
      };

      const mockJobInfoDifferentJobType = structuredClone(mockJobInfo);
      mockJobInfoDifferentJobType.jobTypeId = 'mockJobInfoDifferentJobType';

      const testJobType = new JobType();
      testJobType.id = newUnusedMockJobTypeEntity.id;

      mockJob.jobType.push(testJobType);

      // const existingJob = structuredClone(mockJob);

      // existingJob.jobType[0].id = mockJobInfo.jobTypeId;

      const jobTypeEntityFindOneSpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(mockJobTypeEntity);
      const jobsRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([mockJob]); // This reps all that match

      const updatedExistingJob = structuredClone(mockJob);
      updatedExistingJob.jobType.push(newUnusedMockJobTypeEntity);

      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(updatedExistingJob);

      const consoleSpy = jest.spyOn(console, 'log');

      // Act
      await service.addJobsByBot(newUnusedMockJobTypeEntity.id, [
        mockJobInfo,
        mockJobInfoDifferentJobType,
      ]);

      // Assert
      expect(consoleSpy).not.toHaveBeenCalledWith('adding existing job');
      expect(jobTypeEntityFindOneSpy).toHaveBeenCalled();
      expect(jobsRepositoryFindSpy).toHaveBeenCalled();
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
      suitabilityScore: 95,
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
      mockJob.suitabilityScore = 95;

      const findUsersWithUnsendSuitableJobsSpy = jest
        .spyOn(userService, 'findUsersWithUnsendSuitableJobs')
        .mockResolvedValueOnce([mockUser]);

      const findUsersBestFiveJobsSpy = jest
        .spyOn(service, 'findUsersBestFiveJobs')
        .mockResolvedValueOnce([mockJob]);

      const discordServiceSendMessageSpy = jest.spyOn(
        discordService,
        'sendMessage',
      );

      // Act
      await service.sendDiscordNewJobMessage();
      // Assert
      expect(findUsersWithUnsendSuitableJobsSpy).toHaveBeenCalled();
      expect(findUsersBestFiveJobsSpy).toHaveBeenCalled();
      expect(discordServiceSendMessageSpy).toHaveBeenCalled();
    });

    it('should not fire sendUserNewJobs/sendMessage', async () => {
      // Arrange
      const findUsersWithUnsendSuitableJobsSpy = jest
        .spyOn(userService, 'findUsersWithUnsendSuitableJobs')
        .mockResolvedValueOnce([]);

      const findUsersBestFiveJobsSpy = jest.spyOn(
        service,
        'findUsersBestFiveJobs',
      );

      const discordServiceSendMessageSpy = jest.spyOn(
        discordService,
        'sendMessage',
      );
      // Act
      await service.sendDiscordNewJobMessage();
      // Assert
      expect(findUsersWithUnsendSuitableJobsSpy).toHaveBeenCalled();
      expect(findUsersBestFiveJobsSpy).not.toHaveBeenCalled();
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

  describe('checkJobBatches', () => {
    it('should fire sendDiscordNewJobMessage', async () => {
      // Arrange
      const mockBatch = createMockJob(true);
      const processedJob: CompleteJobParse = {
        indeedId: mockBatch.custom_id,
        ...JSON.parse(mockBatch.response.body.choices[0].message.content),
      };

      const checkPendingBatchesSpy = jest
        .spyOn(batchService, 'checkPendingBatches')
        .mockResolvedValueOnce([mockBatch]);
      const processJobObjectSpy = jest
        .spyOn(service, 'processJobObject')
        .mockReturnValue(processedJob);
      const updateFromCompleteJobParsetSpy = jest.spyOn(
        service,
        'updateFromCompleteJobParse',
      );
      const sendDiscordNewJobMessageSpy = jest.spyOn(
        service,
        'sendDiscordNewJobMessage',
      );

      // Act
      await service.checkJobBatches();

      // Assert
      expect(checkPendingBatchesSpy).toHaveBeenCalled();
      expect(processJobObjectSpy).toHaveBeenCalled();
      expect(updateFromCompleteJobParsetSpy).toHaveBeenCalled();
      expect(sendDiscordNewJobMessageSpy).toHaveBeenCalled();

      expect(checkPendingBatchesSpy).toHaveBeenCalledWith(BatchType.JOB);
      expect(processJobObjectSpy).toHaveBeenCalledWith(mockBatch);
      expect(updateFromCompleteJobParsetSpy).toHaveBeenCalledWith(processedJob);
    });

    it('should return if no responses found', async () => {
      // Arrange
      const checkPendingBatchesSpy = jest
        .spyOn(batchService, 'checkPendingBatches')
        .mockResolvedValueOnce([]);

      const processJobObjectSpy = jest.spyOn(service, 'processJobObject');
      const updateFromCompleteJobParsetSpy = jest.spyOn(
        service,
        'updateFromCompleteJobParse',
      );
      const sendDiscordNewJobMessageSpy = jest.spyOn(
        service,
        'sendDiscordNewJobMessage',
      );

      // Act
      await service.checkJobBatches();

      // Assert
      expect(checkPendingBatchesSpy).toHaveBeenCalled();
      expect(processJobObjectSpy).not.toHaveBeenCalled();
      expect(updateFromCompleteJobParsetSpy).not.toHaveBeenCalled();
      expect(sendDiscordNewJobMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should fire jobRepository.findOne with the id', async () => {
      // Arrange
      const mockJob = createFullUserWithDetails().mockJob;

      const jobRepoFindOneSpy = jest
        .spyOn(jobRepository, 'findOne')
        .mockResolvedValueOnce(mockJob);

      // Act
      const response = await service.findOne(mockJob.id);

      // Assert
      expect(response).toEqual(mockJob);
      expect(jobRepoFindOneSpy).toHaveBeenCalled();
      expect(jobRepoFindOneSpy).toHaveBeenCalledWith({
        relations: {
          jobType: true,
          coverLetter: true,
        },
        where: {
          id: mockJob.id,
        },
      });
    });
  });

  describe('findAllJobsByUser', () => {
    it('should return all jobs to send to a user', async () => {
      // Arrange
      const { mockJob } = createFullUserWithDetails();
      mockJob.suited = true;
      mockJob.notification = false;

      const jobRepoFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([mockJob]);

      // Act
      const response = await service.findAllUserUnsendJobs(
        mockJob.jobType[0].user.id,
      );

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
              id: mockJob.jobType[0].user.id,
            },
          },
          suited: true,
          notification: false,
        },
      });
    });
  });

  describe('findAllAppliedJobs', () => {
    it('should return all jobs that have been applied to', async () => {
      // Arrange
      const state = true;
      const mockJob = createFullUserWithDetails().mockJob;
      mockJob.applied = state;

      const jobRepoFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([mockJob]);

      // Act
      const response = await service.findAllAppliedJobs(
        mockJob.jobType[0].user.id,
        state,
      );

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
          applied: state,
          jobType: {
            user: {
              id: mockJob.jobType[0].user.id,
            },
          },
        },
      });
    });

    it('should return all jobs that have not been applied to', async () => {
      // Arrange
      const state = false;
      const mockJob = createFullUserWithDetails().mockJob;
      mockJob.applied = state;

      const jobRepoFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([mockJob]);

      // Act
      const response = await service.findAllAppliedJobs(
        mockJob.jobType[0].user.id,
        state,
      );

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
          applied: state,
          jobType: {
            user: {
              id: mockJob.jobType[0].user.id,
            },
          },
        },
      });
    });
  });

  describe('findAllCoverLetterToApply', () => {
    it('should return all jobs that have cover letters generated but not applied', async () => {
      // Arrange
      const { mockJob, mockCoverLetter } = createFullUserWithDetails();

      mockJob.applied = false;
      mockJob.suited = true;
      mockCoverLetter.batch = true;
      mockCoverLetter.generatedCoverLetter = faker.lorem.sentence();

      const mockSelectJob = {
        link: mockJob.link,
        applied: false,
        coverLetter: {
          generatedCoverLetter: mockCoverLetter.generatedCoverLetter,
          userPitch: mockCoverLetter.userPitch,
        },
      };

      const unprocessedMockJob = new Job();
      unprocessedMockJob.link = mockJob.link;
      unprocessedMockJob.applied = mockJob.applied;

      const unprocessedMockCoverLetter = new CoverLetter();
      unprocessedMockCoverLetter.generatedCoverLetter =
        mockCoverLetter.generatedCoverLetter;
      unprocessedMockCoverLetter.userPitch = mockCoverLetter.userPitch;

      unprocessedMockJob.coverLetter = unprocessedMockCoverLetter;

      unprocessedMockJob.jobType = [mockJob.jobType[0]];

      const jobRepoFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValue([unprocessedMockJob]);

      // Act
      const response = await service.findAllCoverLetterToApply(
        mockJob.jobType[0].user.id,
      );

      // Assert
      expect(response).toEqual([mockSelectJob]);
      expect(jobRepoFindSpy).toHaveBeenCalled();
      expect(jobRepoFindSpy).toHaveBeenCalledWith({
        where: {
          applied: false,
          suited: true,
          coverLetter: {
            batch: true,
            generatedCoverLetter: Not(IsNull()),
          },
          jobType: {
            user: {
              id: mockJob.jobType[0].user.id,
            },
          },
        },
        relations: {
          coverLetter: true,
          jobType: {
            user: true,
          },
        },
        select: {
          link: true,
          applied: true,
          coverLetter: {
            generatedCoverLetter: true,
            userPitch: true,
          },
          jobType: false,
        },
      });
    });

    it('should throw an error if no jobs are found', async () => {
      // Arrange
      const userId = faker.string.uuid();

      const jobRepoFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValue([]);

      // Act
      const response = service.findAllCoverLetterToApply(userId);

      // Assert
      await expect(response).rejects.toThrow('no_cover_letters_ready');
      expect(jobRepoFindSpy).toHaveBeenCalled();
      expect(jobRepoFindSpy).toHaveBeenCalledWith({
        where: {
          applied: false,
          suited: true,
          coverLetter: {
            batch: true,
            generatedCoverLetter: Not(IsNull()),
          },
          jobType: {
            user: {
              id: userId,
            },
          },
        },
        relations: {
          coverLetter: true,
          jobType: {
            user: true,
          },
        },
        select: {
          link: true,
          applied: true,
          coverLetter: {
            generatedCoverLetter: true,
            userPitch: true,
          },
          jobType: false,
        },
      });
    });
  });

  describe('sendUserNewJobs', () => {
    it('send users new jobs', async () => {
      // Arrange
      const { mockUser, mockJob } = createFullUserWithDetails();

      mockJob.suited = true;
      mockJob.notification = false;

      const updatedMockJob = structuredClone(mockJob);
      updatedMockJob.notification = true;

      const findAllUserUnsendJobsSpy = jest
        .spyOn(service, 'findAllUserUnsendJobs')
        .mockResolvedValueOnce([mockJob]);
      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(updatedMockJob);

      // Act
      const response = await service.sendUserNewJobs(mockUser.id);

      // Assert
      expect(response).toEqual([updatedMockJob]);
      expect(findAllUserUnsendJobsSpy).toHaveBeenCalled();
      expect(findAllUserUnsendJobsSpy).toHaveBeenCalledWith(mockUser.id);
      expect(jobRepositorySaveSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).toHaveBeenCalledWith([updatedMockJob]);
    });
  });

  describe('resetFalse', () => {
    it('should reset all jobs to false for user', async () => {
      // Arrange
      const { mockJob } = createFullUserWithDetails();
      const userId = mockJob.jobType[0].user.id;

      mockJob.suited = false;

      const updatedMockJob = structuredClone(mockJob);
      updatedMockJob.scannedLast = null;

      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([mockJob]);
      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(updatedMockJob);

      // Act
      await service.resetFalse(userId);

      // Assert
      expect(jobRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositoryFindSpy).toHaveBeenCalledWith({
        relations: {
          jobType: {
            user: true,
          },
        },
        where: {
          jobType: {
            user: {
              id: userId,
            },
          },
          suited: false,
        },
      });
      expect(jobRepositorySaveSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).toHaveBeenCalledWith(updatedMockJob);
    });
  });

  describe('updateFromCompleteJobParse', () => {
    it('should update the job from openai', async () => {
      // Arrange
      const { mockJob } = createFullUserWithDetails();

      mockJob.id = faker.string.uuid();
      mockJob.summary = faker.lorem.paragraphs();
      mockJob.conciseDescription = faker.lorem.paragraph();
      mockJob.conciseSuited = faker.lorem.sentence();
      mockJob.scannedLast = new Date();
      mockJob.suited = true;

      const jobRepoUpdateSpy = jest
        .spyOn(jobRepository, 'update')
        .mockResolvedValueOnce({
          raw: [],
          affected: 1,
          generatedMaps: [mockJob],
        } as UpdateResult);
      // Act

      const response = await service.updateFromCompleteJobParse(mockJob);

      // Assert
      expect(jobRepoUpdateSpy).toHaveBeenCalled();
      expect(jobRepoUpdateSpy).toHaveBeenCalledWith(
        { indeedId: mockJob.indeedId },
        {
          summary: mockJob.summary,
          suited: mockJob.suited,
          suitabilityScore: mockJob.suitabilityScore,
          conciseDescription: mockJob.conciseDescription,
          scannedLast: new Date(),
          conciseSuited: mockJob.conciseSuited,
        },
      );
      expect(response).toEqual({
        raw: [],
        affected: 1,
        generatedMaps: [mockJob],
      } as UpdateResult);
    });
  });

  describe('updateJobApplication', () => {
    it('should update the job application status', async () => {
      // Arrange
      const mockJob = createFullUserWithDetails().mockJob;
      const userId = mockJob.jobType[0].user.id;
      const status = true;

      mockJob.applied = false;

      const updatedMockJob = structuredClone(mockJob);
      updatedMockJob.applied = status;

      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'findOne')
        .mockResolvedValueOnce(mockJob);

      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(updatedMockJob);
      // Act
      const response = await service.updateJobApplication(
        userId,
        mockJob.indeedId,
        status,
      );
      // Assert
      expect(jobRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositoryFindSpy).toHaveBeenCalledWith({
        relations: {
          jobType: {
            user: true,
          },
        },
        where: {
          indeedId: mockJob.indeedId,
          jobType: {
            user: {
              id: userId,
            },
          },
        },
      });
      expect(jobRepositorySaveSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).toHaveBeenCalledWith(updatedMockJob);
      expect(response).toEqual(updatedMockJob);
    });
  });

  describe('findUsersBestFiveJobs', () => {
    it('find the users best five jobs not sent out yet', async () => {
      // Arrange
      const { mockUser } = createFullUserWithDetails();
      const findJobsSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([
          new Job(),
          new Job(),
          new Job(),
          new Job(),
          new Job(),
        ]);

      // Act
      const response = await service.findUsersBestFiveJobs(mockUser.id);

      // Assert
      const allInstances = response.every((job) => job instanceof Job);
      expect(allInstances).toBe(true);
      expect(response.length).toBe(5);
      expect(findJobsSpy).toHaveBeenCalled();
      expect(findJobsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          order: {
            suitabilityScore: 'DESC',
          },
          take: 5,
          relations: {
            jobType: {
              user: true,
            },
          },
          where: expect.objectContaining({
            jobType: expect.objectContaining({
              user: expect.objectContaining({
                id: mockUser.id,
              }),
            }),
            suitabilityScore: MoreThanOrEqual(85), // Ensure this is the same instance
            suited: true,
            notification: false,
          }),
        }),
      );
    });
  });

  describe('SendDiscordNewJobMessageToUser', () => {
    it('should send new jobs to a specific user', async () => {
      // Notes: Specific user presses button and gets the next five jobs best suited to them.
      // 1) Get the user 2) Get the most suited job for said user 3) send them to user.
      // Arrange
      const { mockUser, mockJob } = createFullUserWithDetails();
      const findUsersBestFiveJobsSpy = jest
        .spyOn(service, 'findUsersBestFiveJobs')
        .mockResolvedValueOnce([mockJob]);
      // Act
      await service.sendDiscordNewJobMessageToUser(mockUser.id);
      // Assert
      expect(findUsersBestFiveJobsSpy).toHaveBeenCalled();
      expect(findUsersBestFiveJobsSpy).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
