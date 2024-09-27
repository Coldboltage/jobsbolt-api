import { Test, TestingModule } from '@nestjs/testing';
import { CoverLetterController } from './cover-letter.controller';
import { CoverLetterService } from './cover-letter.service';
import { createMock } from '@golevelup/ts-jest';
import { CoverLetter } from './entities/cover-letter.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('CoverLetterController', () => {
  let controller: CoverLetterController;

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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
