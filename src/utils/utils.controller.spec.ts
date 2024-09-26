import { Test, TestingModule } from '@nestjs/testing';
import { UtilsController } from './utils.controller';
import { UtilsService } from './utils.service';
import { createMock } from '@golevelup/ts-jest';

describe('UtilsController', () => {
  let controller: UtilsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UtilsController],
      providers: [UtilsService],
    })
      .useMocker(createMock)
      .compile();

    controller = module.get<UtilsController>(UtilsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
