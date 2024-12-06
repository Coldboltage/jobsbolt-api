import { Test, TestingModule } from '@nestjs/testing';
import { CoverLetterController } from './cover-letter.controller';
import { CoverLetterService } from './cover-letter.service';
import { createMock } from '@golevelup/ts-jest';
import { CoverLetter } from './entities/cover-letter.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { createFullUserWithDetails } from '../jest-utils/utils';

describe('CoverLetterController', () => {
  let controller: CoverLetterController;
  let service: CoverLetterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoverLetterController],
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

    controller = module.get<CoverLetterController>(CoverLetterController);
    service = module.get<CoverLetterService>(CoverLetterService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('resetCv', () => {
    it.only('should fire the resetCv service', async () => {
      // Arrange
      const { mockCoverLetter } = createFullUserWithDetails();

      const resetMockCoverLetter = structuredClone(mockCoverLetter);
      resetMockCoverLetter.generatedCoverLetter = null;
      resetMockCoverLetter.batch = true;

      const reqMock = {
        user: {
          id: faker.string.uuid(),
        },
      };

      const resetCvServiceSpy = jest
        .spyOn(service, 'resetCvs')
        .mockResolvedValueOnce([resetMockCoverLetter]);

      // Act
      const response = await controller.resetCvs(reqMock, {
        cvIds: [mockCoverLetter.id],
      });

      // Assert
      expect(resetCvServiceSpy).toHaveBeenCalled();
      expect(response).toEqual([resetMockCoverLetter]);
    });
  });
});
