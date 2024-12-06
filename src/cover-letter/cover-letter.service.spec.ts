import { Test, TestingModule } from '@nestjs/testing';
import { CoverLetterService } from './cover-letter.service';
import { createMock } from '@golevelup/ts-jest'; // Add the correct import
import { BatchService } from '../batch/batch.service';
import {
  ChatCompletionMessage,
  IndividualJobFromBatch,
  IndividualJobFromBatchChoice,
  IndividualJobFromBatchResponse,
  IndividualJobFromBatchResponseBody,
  Job,
} from '../job/entities/job.entity';
import { faker } from '@faker-js/faker';
import {
  CompleteCoverParse,
  CoverLetter,
} from './entities/cover-letter.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepPartial, In, IsNull, Not, Repository } from 'typeorm';
import { JobService } from '../job/job.service';
import { UtilsService } from '../utils/utils.service';
import OpenAI from 'openai';
import { Role } from '../auth/role.enum';
import { JobType } from '../job-type/entities/job-type.entity';
import { PayUnits } from '../job-type/types';
import { User } from '../user/entities/user.entity';

describe('CoverLetterService', () => {
  let service: CoverLetterService;
  let batchService: BatchService;
  let jobService: JobService;
  let utilService: UtilsService;
  let coverLetterRepository: Repository<CoverLetter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoverLetterService,
        {
          provide: getRepositoryToken(CoverLetter),
          useValue: createMock<Repository<CoverLetter>>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<CoverLetterService>(CoverLetterService);
    batchService = module.get<BatchService>(BatchService);
    jobService = module.get<JobService>(JobService);
    utilService = module.get<UtilsService>(UtilsService);
    coverLetterRepository = module.get<Repository<CoverLetter>>(
      getRepositoryToken(CoverLetter),
    );
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

  const createCoverLetter = () => {
    const mockParsedJobContent: CompleteCoverParse = {
      coverId: faker.string.uuid(),
      cover_letter: faker.lorem.paragraph(),
    };

    const mockChatCompletionMessage: ChatCompletionMessage = {
      role: '',
      content: JSON.stringify(mockParsedJobContent),
    };

    const mockChoice: IndividualJobFromBatchChoice = {
      index: 0,
      message: mockChatCompletionMessage,
    };

    const mockBody: IndividualJobFromBatchResponseBody = {
      id: '',
      object: '',
      created: 0,
      model: '',
      choices: [mockChoice],
    };

    const mockResponse: IndividualJobFromBatchResponse = {
      status_code: 0,
      request_id: faker.string.uuid(),
      body: mockBody,
    };

    const fullMockResponse: IndividualJobFromBatch = {
      id: faker.string.uuid(),
      custom_id: faker.string.uuid(),
      response: mockResponse,
      error: undefined,
    };

    return { fullMockResponse, mockParsedJobContent };
  };

  describe('checkCoverBatches', () => {
    it('should check cover batches', async () => {
      // Arrange
      const { fullMockResponse, mockParsedJobContent } = createCoverLetter();

      const mockAllResponses: IndividualJobFromBatch[] = [fullMockResponse];

      const checkPendingBatches = jest
        .spyOn(batchService, 'checkPendingBatches')
        .mockResolvedValueOnce(mockAllResponses);

      // if will pass here as allResponses is populated

      const processCoverObject = jest
        .spyOn(service, 'processCoverObject')
        .mockReturnValueOnce(mockParsedJobContent);

      const updateFromCompleteCoverParse = jest.spyOn(
        service,
        'updateFromCompleteCoverParse',
      );

      // Act
      await service.checkCoverBatches();

      // Assert
      expect(checkPendingBatches).toHaveBeenCalled();
      expect(processCoverObject).toHaveBeenCalled();
      expect(updateFromCompleteCoverParse).toHaveBeenCalled();
    });

    it('should not process cover object if allResponses is empty', async () => {
      // Arrange
      const mockAllResponses: IndividualJobFromBatch[] = [];

      const checkPendingBatches = jest
        .spyOn(batchService, 'checkPendingBatches')
        .mockResolvedValueOnce(mockAllResponses);
      const processCoverObject = jest.spyOn(service, 'processCoverObject');
      const updateFromCompleteCoverParse = jest.spyOn(
        service,
        'updateFromCompleteCoverParse',
      );

      // Act
      await service.checkCoverBatches();

      // Assert
      expect(checkPendingBatches).toHaveBeenCalled();
      expect(processCoverObject).not.toHaveBeenCalled();
      expect(updateFromCompleteCoverParse).not.toHaveBeenCalled();
    });
  });

  describe('processCoverObject', () => {
    it('should process cover object', () => {
      // Arrange
      const { fullMockResponse } = createCoverLetter();
      const coverResponse = JSON.parse(
        fullMockResponse.response.body.choices[0].message.content,
      );

      // Act
      const result = service.processCoverObject(fullMockResponse);

      // Assert
      expect(result).toMatchObject({
        coverId: fullMockResponse.custom_id,
        cover_letter: coverResponse.cover_letter,
      });
    });
  });

  describe('create', () => {
    it('should create cover letter', async () => {
      // Arrange
      const createCoverLetterDto = {
        jobId: faker.string.uuid(),
        userPitch: faker.lorem.paragraph(),
      };

      const jobEntity: Job = {
        id: '',
        indeedId: '',
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
        coverLetter: null,
        suited: false,
        jobType: [],
        scannedLast: undefined,
        notification: false,
        suitabilityScore: 95,
      };

      const findOne = jest
        .spyOn(jobService, 'findOne')
        .mockResolvedValueOnce(jobEntity);

      const save = jest.spyOn(coverLetterRepository, 'save');

      // Act
      await service.create(createCoverLetterDto);

      // Assert
      expect(findOne).toHaveBeenCalledWith(createCoverLetterDto.jobId);
      expect(save).toHaveBeenCalled();
    });

    it('should throw conflict exception if cover letter already exists', async () => {
      // Arrange
      const createCoverLetterDto = {
        jobId: faker.string.uuid(),
        userPitch: faker.lorem.paragraph(),
      };

      const jobEntity: Job = {
        id: '',
        indeedId: '',
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
        coverLetter: new CoverLetter(),
        suited: false,
        jobType: [],
        scannedLast: undefined,
        notification: false,
        suitabilityScore: 95,
      };

      const findOne = jest
        .spyOn(jobService, 'findOne')
        .mockResolvedValueOnce(jobEntity);

      // Act & Assert
      const response = service.create(createCoverLetterDto);

      // Assert
      await expect(response).rejects.toThrow('cover_letter_already_exists');
      expect(findOne).toHaveBeenCalledWith(createCoverLetterDto.jobId);
    });
  });

  describe('createBatchCover', () => {
    it('should create batch cover', async () => {
      // Arrange
      const coverLetter: CoverLetter = {
        id: faker.string.uuid(),
        userPitch: faker.lorem.paragraph(),
        generatedCoverLetter: null,
        batch: false,
        job: new Job(),
      };

      const findCoverLettersToGenerateSpy = jest
        .spyOn(service, 'findCoverLettersToGenerate')
        .mockResolvedValueOnce([coverLetter]);

      const saveSpy = jest
        .spyOn(coverLetterRepository, 'save')
        .mockResolvedValueOnce([coverLetter] as any);

      const buildJsonLdSpy = jest
        .spyOn(utilService, 'buildJsonLd')
        .mockResolvedValueOnce(Buffer.from(''));

      const mockBatch: OpenAI.Batches.Batch = {
        id: faker.string.uuid(),
        completion_window: '24h',
        created_at: +new Date().toString(),
        endpoint: faker.internet.url(),
        input_file_id: faker.system.filePath(),
        object: 'batch',
        status: 'in_progress',
      };
      const openAISendJSONSpy = jest
        .spyOn(utilService, 'openAISendJSON')
        .mockResolvedValueOnce(mockBatch);

      const createSpy = jest.spyOn(batchService, 'create');

      // Act
      const response = await service.createBatchCover();

      // Assert
      expect(findCoverLettersToGenerateSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(buildJsonLdSpy).toHaveBeenCalled();
      expect(openAISendJSONSpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalled();
      expect(response).toBeUndefined();
    });

    it('should return null if no qualifying covers', async () => {
      // Arrange
      const findCoverLettersToGenerateSpy = jest
        .spyOn(service, 'findCoverLettersToGenerate')
        .mockResolvedValueOnce([]);

      // Act
      const response = await service.createBatchCover();

      // Assert
      expect(findCoverLettersToGenerateSpy).toHaveBeenCalled();
      expect(response).toBeNull();
    });
  });

  describe('findCoverLettersToGenerate', () => {
    it('should find cover letters to generate', async () => {
      // Arrange
      const findSpy = jest.spyOn(coverLetterRepository, 'find');

      // Act
      await service.findCoverLettersToGenerate();

      // Assert
      expect(findSpy).toHaveBeenCalled();
      expect(findSpy).toHaveBeenCalledWith({
        relations: {
          job: {
            jobType: {
              user: true,
            },
          },
        },
        where: {
          generatedCoverLetter: IsNull(),
          userPitch: Not(IsNull()),
          batch: false,
          job: {
            suited: true,
          },
        },
      });
    });
  });

  describe('updateFromCompleteCoverParse', () => {
    it('should update from complete cover parse', async () => {
      // Arrange
      const completeCoverParse: CompleteCoverParse = {
        coverId: faker.string.uuid(),
        cover_letter: faker.lorem.paragraph(),
      };

      const updateSpy = jest.spyOn(coverLetterRepository, 'update');

      // Act
      await service.updateFromCompleteCoverParse(completeCoverParse);

      // Assert
      expect(updateSpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(
        { id: completeCoverParse.coverId },
        { generatedCoverLetter: completeCoverParse.cover_letter },
      );
    });
  });

  describe('resetCv', () => {
    it('should reset the cv', async () => {
      // Arrange
      const { mockCoverLetter, mockUser } = createFullUserWithDetails();

      const resetCoverLetter: DeepPartial<CoverLetter> =
        structuredClone(mockCoverLetter);

      resetCoverLetter.generatedCoverLetter = null;
      resetCoverLetter.batch = false;

      const resetCoverLetterSpy = jest
        .spyOn(coverLetterRepository, 'find')
        .mockResolvedValueOnce([mockCoverLetter]);

      const resetAndSaveCoverLetterSpy = jest
        .spyOn(coverLetterRepository, 'save')
        .mockResolvedValue([resetCoverLetter] as any);
      // Act

      const response = await service.resetCvs(mockUser.id, [
        mockCoverLetter.id,
      ]);

      // Assert
      expect(resetCoverLetterSpy).toHaveBeenCalled();
      expect(resetAndSaveCoverLetterSpy).toHaveBeenCalled();
      expect(response).toEqual([resetCoverLetter]);
      expect(resetCoverLetterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            job: {
              jobType: {
                user: {
                  id: mockUser.id,
                },
              },
            },
            id: In([mockCoverLetter.id]),
            generatedCoverLetter: Not(IsNull()),
            batch: true,
          },
        }),
      );
    });
  });
});
