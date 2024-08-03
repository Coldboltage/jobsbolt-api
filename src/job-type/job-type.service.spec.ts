import { Test, TestingModule } from '@nestjs/testing';
import { JobTypeService } from './job-type.service';

describe('JobTypeService', () => {
  let service: JobTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobTypeService],
    }).compile();

    service = module.get<JobTypeService>(JobTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
