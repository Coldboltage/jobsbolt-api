import { Test, TestingModule } from '@nestjs/testing';
import { DiscordService } from './discord.service';
import { createMock } from '@golevelup/ts-jest';

describe('DiscordService', () => {
  let service: DiscordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscordService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<DiscordService>(DiscordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
