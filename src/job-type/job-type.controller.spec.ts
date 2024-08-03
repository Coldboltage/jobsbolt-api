import { Test, TestingModule } from '@nestjs/testing';
import { JobTypeController } from './job-type.controller';
import { JobTypeService } from './job-type.service';

describe('JobTypeController', () => {
  let controller: JobTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobTypeController],
      providers: [JobTypeService],
    }).compile();

    controller = module.get<JobTypeController>(JobTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
