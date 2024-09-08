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
  ParsedContent,
} from './entities/job.entity';
import { ConfigService } from '@nestjs/config';
import { BatchService } from '../batch/batch.service';
import { BatchStatusEnum } from '../batch/entity/batch.entity';
import { faker } from '@faker-js/faker';
import { JobTypeService } from '../job-type/job-type.service';
import { JobType } from '../job-type/entities/job-type.entity';
import { PayUnits } from '../job-type/types';
import { User } from '../user/entities/user.entity';
import OpenAI from 'openai';
import { Role } from '../auth/role.enum';

const path = require('path');
const fs = require('fs');

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
  });

  const createFullUserWithDetails = () => {
    const mockJobId = faker.string.uuid();
    const mockJob: Job = {
      id: faker.string.uuid(),
      jobId: mockJobId,
      applied: false,
      link: `https://www.indeed.com/viewjob?jk=${mockJobId}`,
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
    };

    mockJob.jobType = mockJobTypeEntity;
    mockJobTypeEntity.user = mockUser;

    return { mockUser, mockJobTypeEntity, mockJob };
  };

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
    it('should not execute anything after buildJsonLd', async () => {
      // Arrange
      const buildJobJsonSpy = jest
        .spyOn(service, 'buildJsonLd')
        .mockResolvedValueOnce(null);

      const openAISendJSONSpy = jest.spyOn(service, 'openAISendJSON');
      const batchServiceCreateSpy = jest.spyOn(batchService, 'create');

      // Act
      await service.createBatchJob();
      // Assert
      expect(buildJobJsonSpy).toHaveBeenCalled();
      expect(openAISendJSONSpy).not.toHaveBeenCalled();
      expect(batchServiceCreateSpy).not.toHaveBeenCalled();
    });

    it('should execute batchsService.create', async () => {
      // Arrange
      const mockBuffer = Buffer.from('some test data');

      const buildJobJsonSpy = jest
        .spyOn(service, 'buildJsonLd')
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
        .spyOn(service, 'openAISendJSON')
        .mockResolvedValueOnce(mockBatch);
      const batchServiceCreateSpy = jest
        .spyOn(batchService, 'create')
        .mockResolvedValueOnce(undefined);

      // Act
      await service.createBatchJob();
      // Assert
      expect(buildJobJsonSpy).toHaveBeenCalled();
      expect(openAISendJSONSpy).toHaveBeenCalled();
      expect(batchServiceCreateSpy).toHaveBeenCalled();
      expect(batchServiceCreateSpy).toHaveBeenCalledWith({
        id: mockBatch.id,
        status: BatchStatusEnum.VALIDATING,
        filename: mockBatch.input_file_id,
      });
    });
  });

  describe('checkBatches', () => {
    it('do not do anything', async () => {
      // Arrange
      const mockAllResponses = undefined;
      const checkPendingBatchJobsSpy = jest
        .spyOn(batchService, 'checkPendingBatchJobs')
        .mockResolvedValueOnce(mockAllResponses);

      const processJobObjectSpy = jest.spyOn(service, 'processJobObject');

      const updateFromCompleteJobParsetSpy = jest
        .spyOn(service, 'updateFromCompleteJobParse')
        .mockResolvedValueOnce(undefined);

      const sendDiscordNewJobMessageSpy = jest.spyOn(
        service,
        'sendDiscordNewJobMessage',
      );
      // Act
      await service.checkBatches();

      // Assert
      expect(checkPendingBatchJobsSpy).toHaveBeenCalled();
      expect(processJobObjectSpy).not.toHaveBeenCalled();
      expect(updateFromCompleteJobParsetSpy).not.toHaveBeenCalled();
      expect(sendDiscordNewJobMessageSpy).not.toHaveBeenCalled();
    });

    it('should update a job from a batch and call Discord Message', async () => {
      // Arrange
      const mockAllResponses: IndividualJobFromBatch = {
        id: '',
        custom_id: '',
        response: undefined,
        error: undefined,
      };

      const checkPendingBatchJobsSpy = jest
        .spyOn(batchService, 'checkPendingBatchJobs')
        .mockResolvedValueOnce([mockAllResponses]);

      const mockCompleteJob: CompleteJobParse = {
        jobId: '',
        summary: '',
        suited: false,
        conciseDescription: '',
        conciseSuited: '',
      };

      const processJobObjectSpy = jest
        .spyOn(service, 'processJobObject')
        .mockReturnValue(mockCompleteJob);

      const updateFromCompleteJobParsetSpy = jest
        .spyOn(service, 'updateFromCompleteJobParse')
        .mockResolvedValueOnce(undefined);

      const sendDiscordNewJobMessageSpy = jest
        .spyOn(service, 'sendDiscordNewJobMessage')
        .mockResolvedValueOnce(undefined);

      // Act
      await service.checkBatches();

      // Assert
      expect(checkPendingBatchJobsSpy).toHaveBeenCalled();
      expect(processJobObjectSpy).toHaveBeenCalled();
      expect(updateFromCompleteJobParsetSpy).toHaveBeenCalled();
      expect(sendDiscordNewJobMessageSpy).toHaveBeenCalled();
    });
  });

  describe('processJobObject', () => {
    const createMockContent = (state: boolean): ParsedContent => {
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
        analysis: '',
        is_suitable: false,
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
        jobId: mockJob.custom_id,
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
        jobId: mockJob.custom_id,
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
    const mockJobTypeId = faker.string.uuid();
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
    const mockJob: JobInfoInterface = {
      jobId: faker.string.uuid(),
      jobTypeId: mockJobTypeId,
      name: faker.person.jobTitle(),
      description: faker.person.jobDescriptor(),
      pay: String(faker.helpers.rangeToNumber({ min: 15, max: 100 })),
      location: faker.location.city(),
      companyName: faker.company.name(),
    };
    const jobEntity: Job = {
      id: faker.string.uuid(),
      jobId: mockJob.jobId,
      applied: false,
      link: `https://www.indeed.com/viewjob?jk=${mockJob.jobId}`,
      name: mockJob.name,
      companyName: mockJob.companyName,
      date: new Date(),
      description: mockJob.description,
      pay: mockJob.pay,
      location: mockJob.location,
      summary: null,
      conciseDescription: null,
      conciseSuited: null,
      suited: false,
      jobType: mockJobTypeEntity,
      scannedLast: null,
      notification: false,
    };

    it('add a job', async () => {
      // Arrange
      const jobTypeEntitySpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(mockJobTypeEntity);
      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([]);
      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(jobEntity);

      // Act
      await service.addJobsByBot(mockJobTypeId, [mockJob]);

      // Assert
      expect(jobRepositorySaveSpy).toHaveBeenCalledWith({
        jobId: mockJob.jobId,
        link: `https://www.indeed.com/viewjob?jk=${mockJob.jobId}`,
        name: mockJob.name,
        date: expect.any(Date), // You can use `expect.any(Date)` if the exact date is not crucial
        description: mockJob.description,
        pay: mockJob.pay,
        location: mockJob.location,
        suited: false, // Static value as per your implementation
        jobType: mockJobTypeEntity, // The jobType entity returned from findOne
        scannedLast: null, // Static value as per your implementation
        companyName: mockJob.companyName,
      });
      expect(jobTypeEntitySpy).toHaveBeenCalled();
      expect(jobRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).toHaveBeenCalledTimes(1);
    });

    it('should not add a new job as the job already exists', async () => {
      // Arrange
      const existingJobEntity: Job = {
        id: '',
        jobId: mockJob.jobId,
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
        jobType: new JobType(),
        scannedLast: undefined,
        notification: false,
      };

      const jobTypeEntitySpy = jest
        .spyOn(jobTypeService, 'findOne')
        .mockResolvedValueOnce(mockJobTypeEntity);
      const jobRepositoryFindSpy = jest
        .spyOn(jobRepository, 'find')
        .mockResolvedValueOnce([existingJobEntity]);
      const jobRepositorySaveSpy = jest
        .spyOn(jobRepository, 'save')
        .mockResolvedValueOnce(jobEntity);

      // Act
      await service.addJobsByBot(mockJobTypeId, [mockJob]);

      // Assert
      expect(jobTypeEntitySpy).toHaveBeenCalled();
      expect(jobRepositoryFindSpy).toHaveBeenCalled();
      expect(jobRepositorySaveSpy).not.toHaveBeenCalled();
    });
  });

  describe('scanAvailableJobs', () => {
    const mockJobId = faker.string.uuid();
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
      jobId: mockJobId,
      applied: false,
      link: `https://www.indeed.com/viewjob?jk=${mockJobId}`,
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
      jobType: mockJobTypeEntity,
      scannedLast: null,
      notification: false,
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

  describe('openAISendJSON', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clear any previous mock calls
    });

    it('Create OpenAI Batch Request', async () => {
      // Arrange
      const mockResponse: OpenAI.Files.FileObject = {
        id: '',
        bytes: 0,
        created_at: 0,
        filename: '',
        object: 'file',
        purpose: 'batch',
        status: 'uploaded',
      };

      const mockBatch: OpenAI.Batches.Batch = {
        id: '',
        completion_window: '24h',
        created_at: 0,
        endpoint: '/v1/chat/completions',
        input_file_id: '',
        object: 'batch',
        status: 'completed',
      };

      // Set up the mock return values
      mockCreate.mockResolvedValue(mockResponse);
      mockBatchesCreate.mockResolvedValue(mockBatch);

      // Act
      const response = await service.openAISendJSON();

      // Assert
      console.log(response);
      expect(mockCreate).toHaveBeenCalled();
      expect(mockBatchesCreate).toHaveBeenCalled();
    });
  });

  describe('createContentMessage', () => {
    it('return the base words required', () => {
      // Arrange

      const { mockJob } = createFullUserWithDetails();

      // Act
      const response = service.createContentMessage(mockJob);

      // Assert
      expect(response).toContain(
        "Here is a job I'm looking to apply for Job Description",
      );
      expect(response).toContain('Job Pay:');
      expect(response).toContain('Job Location:');
      expect(response).toContain(
        'I wanted to know if it would suit me given the following cv:',
      );
      expect(response).toContain(
        "Here's also my personal descrption of myself and what I'm looking for:",
      );
      expect(response).toContain(
        'The CV helps but the description gives a more recent telling of what the user is thinking.',
      );
      expect(response).toContain(mockJob.description);
      expect(response).toContain(mockJob.pay);
      expect(response).toContain(mockJob.location);
      expect(response).toContain(mockJob.jobType.user.cv);
      expect(response).toContain(mockJob.jobType.user.description);
      expect(typeof response).toBe('string');
    });
  });

  describe('buildJobJson', () => {
    it('should create the JSON exactly to template', () => {
      // Arrange
      const { mockJob } = createFullUserWithDetails();
      const createContentMessageSpy = jest
        .spyOn(service, 'createContentMessage')
        .mockReturnValueOnce('message');

      const jsonLayout = {
        custom_id: mockJob.jobId,
        method: 'POST',
        url: '/v1/chat/completions',
        body: {
          model: 'gpt-4o-2024-08-06',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful and experienced career advisor. Your task is to analyze job descriptions and compare them with candidate resumes. Provide feedback on how well the candidate fits the job, identify key strengths and gaps, and give a recommendation on whether the job is a good match for the candidate.',
            },
            { role: 'user', content: expect.any(String) },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'job_analysis_schema',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  analysis: {
                    type: 'string',
                    description:
                      'The analysis of how well the candidate fits the job description. This should consider both current qualifications and potential for growth. Location matters a lot. If the job requires to move continent, that might be problematic. See the user description if provided.',
                  },
                  is_suitable: {
                    type: 'boolean',
                    description:
                      'A boolean indicating if the candidate is a good match for the job, based on the analysis provided.',
                  },
                  conciseDescription: {
                    type: 'string',
                    description: ` Please format the job descrption, job pay and job location, into a very concise Discord embed message using emojis in Markdown. Include the job title, company name, location, salary range, a brief description of the role, key responsibilities, benefits, and any important notes. Use emojis that fit the context. Use the following format, don't tell me you've made it concise, just give me the message:.`,
                  },
                  conciseSuited: {
                    type: 'string',
                    description: `Using the analysis and is_suited in a very concise way, explain why you feel they were suited.`,
                  },
                },
                required: [
                  'analysis',
                  'is_suitable',
                  'conciseDescription',
                  'conciseSuited',
                ],
                additionalProperties: false,
              },
            },
          },
          max_tokens: 1000,
        },
      };

      // Act
      const result = service.buildJobJson(mockJob);

      // Assert
      expect(createContentMessageSpy).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(jsonLayout));
    });
  });

  describe('sendDiscordNewJobMessage', () => {
    it('should send job messages to users')
  })
});
