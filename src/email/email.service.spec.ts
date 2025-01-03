import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { createMock } from '@golevelup/ts-jest';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).useMocker(createMock)
      .compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
