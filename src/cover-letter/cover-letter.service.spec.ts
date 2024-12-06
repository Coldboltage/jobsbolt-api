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
import { IsNull, Not, Repository } from 'typeorm';
import { JobService } from '../job/job.service';
import { UtilsService } from '../utils/utils.service';
import OpenAI from 'openai';

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
    })
  })
});
