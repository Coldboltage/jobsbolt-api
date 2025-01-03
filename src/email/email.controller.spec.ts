import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { createMock } from '@golevelup/ts-jest';

describe('EmailController', () => {
  let controller: EmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
    }).useMocker(createMock)
      .compile();


    controller = module.get<EmailController>(EmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
