import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserSeeder } from './seeder.service';
import { SeedConfig } from '../config/seed/seed.config';
import { faker } from '@faker-js/faker';

describe('SeederService', () => {
  let service: UserSeeder;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSeeder,
        {
          provide: getRepositoryToken(User),
          useValue: createMock<Repository<User>>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<UserSeeder>(UserSeeder);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seed', () => {
    it('should seed the user', async () => {
      // Arrange
      const userConfig: SeedConfig = {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
      };

      const userRepoFinOneSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(null);

      const savedUser: User = {
        ...userConfig,
        id: '',
        date: undefined,
        cv: '',
        discordId: '',
        description: '',
        baseCoverLetter: '',
        userTalk: '',
        roles: [],
        jobType: [],
      };

      const userRepoSaveSpy = jest
        .spyOn(userRepository, 'save')
        .mockResolvedValueOnce(savedUser);

      // Act
      const response = await service.seed();

      // Assert
      expect(userRepoFinOneSpy).toHaveBeenCalled();
      expect(userRepoSaveSpy).toHaveBeenCalled();
      expect(response).toEqual(savedUser);
    });

    it('should throw an error if the user already exists', async () => {
      // Arrange
      const userRepoFindOneSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(new User());

      // Act
      const response = service.seed();

      // Assert
      await expect(response).rejects.toThrowError('User already exists');
      expect(userRepoFindOneSpy).toHaveBeenCalled();
    });
  });
});
