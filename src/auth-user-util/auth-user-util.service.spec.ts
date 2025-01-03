import { Test, TestingModule } from '@nestjs/testing';
import { AuthUserUtilService } from './auth-user-util.service';
import { createMock } from '@golevelup/ts-jest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

describe('AuthUserUtilService', () => {
  let service: AuthUserUtilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthUserUtilService, {
        provide: getRepositoryToken(User),
        useValue: createMock<Repository<User>>(),
      },],
    }).useMocker(createMock)
      .compile();

    service = module.get<AuthUserUtilService>(AuthUserUtilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
