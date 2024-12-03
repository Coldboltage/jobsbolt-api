import { Test, TestingModule } from '@nestjs/testing';
import { UtilsService } from './utils.service';
import { createMock } from '@golevelup/ts-jest';
import { Job, JobJson } from '../job/entities/job.entity';
import { faker } from '@faker-js/faker';
import {
  CoverLetter,
  CoverLetterJson,
} from '../cover-letter/entities/cover-letter.entity';
import { JobType } from '../job-type/entities/job-type.entity';
import { PayUnits } from '../job-type/types';
import { User } from '../user/entities/user.entity';
import { Role } from '../auth/role.enum';
import * as fs from 'fs/promises'; // Import from 'fs/promises' for async/await usage
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
const path = require('path');

// Manually mock the OpenAI class
jest.mock('openai', () => {
  // Return an object with the constructor and mock methods
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        files: {
          create: mockCreate,
        },
        batches: {
          create: mockBatchesCreate,
        },
      };
    }),
  };
});

// Create mock instances
const mockCreate = jest.fn();
const mockBatchesCreate = jest.fn();

describe('UtilsService', () => {
  let service: UtilsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UtilsService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<UtilsService>(UtilsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const createFullUserWithDetails = () => {
    const mockindeedId = '123';
    // Create an instance of Job
    const mockJob = new Job();
    mockJob.id = faker.string.uuid();
    mockJob.indeedId = mockindeedId;
    mockJob.applied = false;
    mockJob.link = `https://www.indeed.com/viewjob?jk=${mockindeedId}`;
    mockJob.name = faker.person.jobTitle();
    mockJob.companyName = faker.company.name();
    mockJob.date = new Date();
    mockJob.description = faker.person.jobDescriptor();
    mockJob.pay = String(faker.helpers.rangeToNumber({ min: 15, max: 100 }));
    mockJob.location = faker.location.city();
    mockJob.summary = null;
    mockJob.conciseDescription = null;
    mockJob.conciseSuited = null;
    mockJob.suited = false;
    mockJob.jobType = null;
    mockJob.scannedLast = null;
    mockJob.notification = false;
    mockJob.coverLetter = new CoverLetter();

    // Create an instance of JobType
    const mockJobTypeEntity = new JobType();
    mockJobTypeEntity.id = faker.string.uuid();
    mockJobTypeEntity.name = faker.person.jobTitle();
    mockJobTypeEntity.location = faker.location.city();
    mockJobTypeEntity.user = null;
    mockJobTypeEntity.jobs = [mockJob];
    mockJobTypeEntity.date = undefined;
    mockJobTypeEntity.active = false;
    mockJobTypeEntity.desiredPay = 0;
    mockJobTypeEntity.desiredPayUnit = PayUnits.MONTHLY;
    mockJobTypeEntity.description = '';

    // Create an instance of User
    const mockUser = new User();
    mockUser.id = faker.string.uuid();
    mockUser.name = faker.person.fullName();
    mockUser.email = faker.internet.email();
    mockUser.password = faker.internet.password();
    mockUser.date = new Date();
    mockUser.cv = faker.lorem.lines();
    mockUser.discordId = faker.internet.userName();
    mockUser.description = faker.lorem.lines();
    mockUser.roles = [Role.USER];
    mockUser.jobType = [mockJobTypeEntity];
    mockUser.baseCoverLetter = faker.lorem.paragraph();
    mockUser.userTalk = faker.lorem.paragraph();

    // Create an instance of CoverLetter
    const mockCoverLetter = new CoverLetter();
    mockCoverLetter.id = faker.string.uuid();
    mockCoverLetter.userPitch = faker.lorem.paragraph();
    mockCoverLetter.generatedCoverLetter = faker.lorem.paragraph();
    mockCoverLetter.batch = false;
    mockCoverLetter.job = mockJob;

    // Set relationships
    mockJob.jobType = [mockJobTypeEntity];
    mockJobTypeEntity.user = mockUser;
    return { mockUser, mockJobTypeEntity, mockJob, mockCoverLetter };
  };

  const createMockJobJsonLayout = (mockJob: Job): JobJson => {
    return {
      custom_id: mockJob.indeedId,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are a helpful and experienced career advisor. Your task is to analyze job descriptions and compare them with candidate resumes. Provide feedback on how well the candidate fits the job, identify key strengths and gaps, and give a recommendation on whether the job is a good match for the candidate. We want to make sure the text is not AI detectable`,
          },
          { role: 'user', content: expect.any(String) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'job_analysis_schema',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                analysis: {
                  type: 'string',
                  description:
                    'The analysis of how well the candidate fits the job description. This should consider both current qualifications and potential for growth. Location matters a lot. If the job requires to move continent, that might be problematic. See the user description if provided.',
                },
                is_suitable: {
                  type: 'boolean',
                  description:
                    'A boolean indicating if the candidate is a good match for the job, based on the analysis provided.',
                },
                conciseDescription: {
                  type: 'string',
                  description: ` Please format the job descrption, job pay and job location, into a very concise Discord embed message using emojis in Markdown. Include the job title, company name, location, salary range, a brief description of the role, key responsibilities, benefits, and any important notes. Use emojis that fit the context. Use the following format, don't tell me you've made it concise, just give me the message:.`,
                },
                conciseSuited: {
                  type: 'string',
                  description: `Using the analysis and is_suited in a very concise way, explain why you feel they were suited.`,
                },
              },
              required: [
                'analysis',
                'is_suitable',
                'conciseDescription',
                'conciseSuited',
              ],
              additionalProperties: false,
            },
          },
        },
        max_tokens: 1000,
      },
    };
  };

  const createMockCoverJsonLayout = (
    coverLetter: CoverLetter,
  ): CoverLetterJson => {
    return {
      custom_id: coverLetter.id,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an experienced career advisor and writing assistant. Your role is to help users craft personalized cover letters that reflect their unique writing style, based on an example base cover letter they provide. The goal is to ensure the generated letter mimics the user’s natural writing tone—often a mix of casual conversation and technical language—avoiding overly formal or robotic phrasing that might trigger AI detection. The cover letter should address the specific requirements of the job, link relevant skills, and sound as if it were written personally by the user. Keep it concise, and neutral tone. Avoid overly enthusiastic or playful language liked excited, thrilled, stuff like that. Lean to neutral but follow the user tone.`,
          },
          { role: 'user', content: expect.any(String) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'cover_letter_analysis_schema', // Ensure the schema is named properly
            strict: true, // Enforce strict adherence to the schema
            schema: {
              type: 'object',
              properties: {
                example_user_conversation: {
                  type: 'string',
                  description: `Take note of how the user writes here. The writing style here should be incorpated so that AI detection is not possible. Here's the cover letter pitch: ${coverLetter.userPitch}. Here's the users submitted sample text: ${coverLetter.job.jobType[0].user.userTalk}}`,
                },
                writing_analysis: {
                  type: 'string',
                  description:
                    'Analyze how the base cover letter, CV, and user pitch are written. Ensure the generated cover letter mimics the user’s conversational style, technical references, and tone shifts. The user often speaks with a mix of informal phrasing and technical exploration (e.g., speculative language like "I’m guessing" or "maybe"). Minor grammar fixes are allowed, but the user’s voice must remain authentic. Avoid formal AI-sounding language.',
                },
                skills_mentioned_in_job: {
                  type: 'string',
                  description:
                    'Identify all the skills, qualities, and descriptions in the job posting. If these skills or qualities are mentioned in the CV, base cover letter, or user pitch, they must be included in the final cover letter.',
                },
                job_requirements_matching: {
                  type: 'string',
                  description:
                    'Ensure the generated cover letter explicitly links the user’s skills and experiences to the specific requirements in the job description. If the job mentions certain qualifications (e.g., APIs, AWS, GitHub), make sure the user’s relevant experience is clearly and directly tied to these.',
                },
                cover_letter: {
                  type: 'string',
                  description:
                    "Generate the complete cover letter by combining the writing analysis (to match the user’s writing style), the skills mentioned in the job (to match the job description), and the job requirements matching (to ensure specific job qualifications are linked to the user’s experiences). Ensure it reads as a cohesive and professional cover letter. Use commas for breaks in thought or emphasis, ensuring natural and smooth sentence flow. The example_user_conversation allows you to know how the user writes normally to GPT as responses. We want to make sure this cover letter is not AI-detectable. Keep it concise and in a neutral tone. Avoid overly enthusiastic or playful language like 'excited,' 'thrilled,' and similar terms. Lean toward neutral but follow the user's tone.",
                },
              },
              required: [
                'example_user_conversation',
                'writing_analysis',
                'skills_mentioned_in_job',
                'job_requirements_matching',
                'cover_letter',
              ], // All properties are required
              additionalProperties: false, // Do not allow any extra fields
            },
          },
        },
        max_tokens: 1600,
      },
    };
  };

  describe('createJobContentMessage', () => {
    it('should return a string with some certain structure', () => {
      // Arrange
      const { mockJob } = createFullUserWithDetails();

      // Act
      const response = service.createJobContentMessage(mockJob);

      // Assert
      expect(response).toContain(
        `Here is a job I'm looking to apply for Job Description:`,
      );
      expect(response).toContain(`Job Pay:`);
      expect(response).toContain(`Job Location:`);
      expect(response).toContain(
        `I wanted to know if it would suit me given the following cv:`,
      );
      expect(response).toContain(
        `Here's also my personal descrption of myself and what I'm looking for:`,
      );
      expect(response).toContain(
        `The CV helps but the description gives a more recent telling of what the user is thinking.`,
      );
      expect(response).toContain(`The job type description is as follows:`);
      expect(response).toContain(
        `This serves to further refine the search, specifying particular criteria for the type of job being sought.`,
      );
    });
  });

  describe('createCoverLetterMessage', () => {
    it('should return a string with some certain structure', () => {
      // Arrange
      const { mockCoverLetter } = createFullUserWithDetails();

      // Act
      const response = service.createCoverLetterMessage(mockCoverLetter);

      // Assert
      expect(response).toContain(
        `I am requesting a personalized cover letter based on the following details. Please ensure the generated letter closely follows the user's writing style and tone, whether it's formal or informal, while being grammatically correct and concise:`,
      );
      expect(response).toContain(
        `Base Cover Letter: Use the style and tone from the user's base cover letter provided. The generated cover letter should closely mimic the user's voice—whether it's formal, informal, direct, or more professional. Here is the base cover letter:`,
      );
      expect(response).toContain(
        `CV: Use relevant details from the user's CV to align their skills, experiences, and accomplishments with the job description. The generated letter should emphasize where their qualifications match the job requirements and address any key areas that may be missing from the base cover letter. Here is the user's CV:`,
      );
      expect(response).toContain(
        `User Pitch: This is the user's unfiltered pitch, where they express in their own words why they are a strong fit for the position. Use this pitch to infuse the cover letter with the user's personal touch and feelings about the role, staying consistent with their natural tone (whether formal or informal). Here is the user's pitch:`,
      );
      expect(response).toContain(
        `User Talking Style: Adhere to the user's specific talking and writing style as provided in the variable. Ensure the generated text reflects the natural tone, phrasing, and style from the given input.`,
      );
      expect(response).toContain(
        `Goal: The generated cover letter should reflect the user's personal voice and style (formal or informal), align their experience with the job description, and address any key areas that are essential for the role. Make sure the letter is concise, clear, and tailored specifically to the job.`,
      );
    });
  });

  describe('buildJobJson', () => {
    const { mockJob } = createFullUserWithDetails();
    const jsonLayout = createMockJobJsonLayout(mockJob);
    it('should create the JSON exactly to template', () => {
      // Arrange
      const createContentMessageSpy = jest
        .spyOn(service, 'createJobContentMessage')
        .mockReturnValueOnce('message');

      // Act
      const result = service.buildJobJson(mockJob);

      // Assert
      expect(createContentMessageSpy).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(jsonLayout));
    });
  });

  describe('buildCoverLetterJson', () => {
    const { mockCoverLetter } = createFullUserWithDetails();
    const jsonLayout = createMockCoverJsonLayout(mockCoverLetter);
    it('should create the JSON exactly to template', () => {
      // Arrange
      const createContentMessageSpy = jest
        .spyOn(service, 'createCoverLetterMessage')
        .mockReturnValueOnce('message');

      // Act
      const result = service.buildCoverLetterJson(mockCoverLetter);

      // Assert
      expect(createContentMessageSpy).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(jsonLayout));
    });
  });

  describe('buildJsonLd', () => {
    // afterEach(async () => {
    //   try {
    //     // Check if the file exists asynchronously
    //     await fs.access(filePath); // If file does not exist, this will throw an error
    //     await fs.unlink(filePath); // Asynchronously delete the file
    //   } catch (err) {
    //     if (err.code !== 'ENOENT') {
    //       // Ignore the error if the file doesn't exist
    //       throw err;
    //     }
    //   }
    // });
    it('should create job-requests.jsonl (job)', async () => {
      // Arrange
      const { mockJob } = createFullUserWithDetails();
      const jsonJob = createMockJobJsonLayout(mockJob);
      const filePath = path.join(__dirname, 'job-requests.jsonl');

      const buildJobJsonSpy = jest
        .spyOn(service, 'buildJobJson')
        .mockReturnValueOnce(jsonJob);

      const jsonLFormatJobs = [jsonJob]
        .map((job) => {
          console.log(job);
          return JSON.stringify(job);
        })
        .join('\n');

      // Act
      const response = await service.buildJsonLd([mockJob], 'job');
      // Assert
      expect(buildJobJsonSpy).toHaveBeenCalled();
      expect(response).toBeInstanceOf(Buffer);
      expect(response).toEqual(Buffer.from(jsonLFormatJobs, 'utf-8'));
      await expect(fs.access(filePath)).resolves.not.toThrow();
    });
    it('should create cover-requests.jsonl (cover)', async () => {
      // Arrange
      const { mockCoverLetter } = createFullUserWithDetails();
      const jsonCover = createMockCoverJsonLayout(mockCoverLetter);
      const filePath = path.join(__dirname, 'cover-requests.jsonl');

      const buildJobJsonSpy = jest
        .spyOn(service, 'buildCoverLetterJson')
        .mockReturnValueOnce(jsonCover);

      const jsonLFormatJobs = [jsonCover]
        .map((job) => {
          console.log(job);
          return JSON.stringify(job);
        })
        .join('\n');

      // Act
      const response = await service.buildJsonLd([mockCoverLetter], 'cover');
      // Assert
      expect(buildJobJsonSpy).toHaveBeenCalled();
      expect(response).toBeInstanceOf(Buffer);
      expect(response).toEqual(Buffer.from(jsonLFormatJobs, 'utf-8'));
      await expect(fs.access(filePath)).resolves.not.toThrow();
    });
  });

  describe('openAISendJSON', () => {
    const filePath = path.join(__dirname, 'job-requests.jsonl');
    beforeAll(async () => {
      jest.clearAllMocks(); // Clear any previous mock calls
      const jsonLFormatJobs = [jsonLayout]
        .map((job) => {
          console.log(job);
          return JSON.stringify(job);
        })
        .join('\n');
      await fs.writeFile(filePath, jsonLFormatJobs); // Asynchronously writes the file
    });

    // afterAll(async () => {
    //   try {
    //     // Check if the file exists asynchronously
    //     await fs.access(filePath); // If file does not exist, this will throw an error
    //     await fs.unlink(filePath); // Asynchronously delete the file
    //   } catch (err) {
    //     if (err.code !== 'ENOENT') {
    //       // Ignore the error if the file doesn't exist
    //       throw err;
    //     }
    //   }
    // });

    const { mockJob } = createFullUserWithDetails();
    const jsonLayout = {
      custom_id: mockJob.indeedId,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful and experienced career advisor. Your task is to analyze job descriptions and compare them with candidate resumes. Provide feedback on how well the candidate fits the job, identify key strengths and gaps, and give a recommendation on whether the job is a good match for the candidate.',
          },
          { role: 'user', content: expect.any(String) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'job_analysis_schema',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                analysis: {
                  type: 'string',
                  description:
                    'The analysis of how well the candidate fits the job description. This should consider both current qualifications and potential for growth. Location matters a lot. If the job requires to move continent, that might be problematic. See the user description if provided.',
                },
                is_suitable: {
                  type: 'boolean',
                  description:
                    'A boolean indicating if the candidate is a good match for the job, based on the analysis provided.',
                },
                conciseDescription: {
                  type: 'string',
                  description: ` Please format the job descrption, job pay and job location, into a very concise Discord embed message using emojis in Markdown. Include the job title, company name, location, salary range, a brief description of the role, key responsibilities, benefits, and any important notes. Use emojis that fit the context. Use the following format, don't tell me you've made it concise, just give me the message:.`,
                },
                conciseSuited: {
                  type: 'string',
                  description: `Using the analysis and is_suited in a very concise way, explain why you feel they were suited.`,
                },
              },
              required: [
                'analysis',
                'is_suitable',
                'conciseDescription',
                'conciseSuited',
              ],
              additionalProperties: false,
            },
          },
        },
        max_tokens: 1000,
      },
    };

    it('Create OpenAI Batch Request', async () => {
      // Arrange
      const mockResponse: OpenAI.Files.FileObject = {
        id: '',
        bytes: 0,
        created_at: 0,
        filename: '',
        object: 'file',
        purpose: 'batch',
        status: 'uploaded',
      };

      const mockBatch: OpenAI.Batches.Batch = {
        id: '',
        completion_window: '24h',
        created_at: 0,
        endpoint: '/v1/chat/completions',
        input_file_id: '',
        object: 'batch',
        status: 'completed',
      };

      // Set up the mock return values
      mockCreate.mockResolvedValue(mockResponse);
      mockBatchesCreate.mockResolvedValue(mockBatch);

      // Act
      const response = await service.openAISendJSON('job');

      // Assert
      console.log(response);
      expect(mockCreate).toHaveBeenCalled();
      expect(mockBatchesCreate).toHaveBeenCalled();
      await expect(fs.access(filePath)).resolves.not.toThrow();
    });

    it('should throw an error', async () => {
      // Arrange
      try {
        // Check if the file exists asynchronously
        await fs.access(filePath); // If file does not exist, this will throw an error
        await fs.unlink(filePath); // Asynchronously delete the file
      } catch (err) {
        if (err.code !== 'ENOENT') {
          // Ignore the error if the file doesn't exist
          throw err;
        }
      }

      // Act
      const response = service.openAISendJSON('job');

      // Assert
      await expect(response).rejects.toThrow('File not found');
    });
  });

  describe('checkStatus', () => {
    it('should return true if all messages are completed', async () => {
      // Arrange
      const userConfigServiceSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('username');
      const userPasswordConfigServiceSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('password');
      const consoleSpy = jest.spyOn(console, 'log');

      jest.spyOn(axios, 'get').mockResolvedValueOnce({
        data: {
          messages: 0,
        },
      });

      // Act
      const response = await service.checkStatus();

      // Assert
      expect(response).toEqual(true);
      expect(userConfigServiceSpy).toHaveBeenCalled();
      expect(userPasswordConfigServiceSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('No more messages');
    });

    it('should return false if all messages are completed', async () => {
      // Arrange
      const userConfigServiceSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('username');
      const userPasswordConfigServiceSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('password');
      const consoleSpy = jest.spyOn(console, 'log');

      jest.spyOn(axios, 'get').mockResolvedValueOnce({
        data: {
          messages: 1,
        },
      });

      // Act
      const response = await service.checkStatus();

      // Assert
      expect(response).toEqual(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Still a message being processed',
      );
    });

    it('should return false if error in axios call', async () => {
      // Arrange
      const userConfigServiceSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('username');
      const userPasswordConfigServiceSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce('password');

      jest.spyOn(axios, 'get').mockRejectedValueOnce({
        response: {
          status: 401,
        },
      });

      // Act
      const response = await service.checkStatus();

      // Assert
      expect(response).toEqual(false);
      expect(userConfigServiceSpy).toHaveBeenCalled();
      expect(userPasswordConfigServiceSpy).toHaveBeenCalled();
    });

    it('should return true if implementations are as is', async () => {
      // Arrange
      const mockUsername = faker.internet.userName();
      const mockPassword = faker.internet.password();

      const userConfigServiceSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(mockUsername);
      const userPasswordConfigServiceSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(mockPassword);

      const axiosSpy = jest.spyOn(axios, 'get').mockResolvedValueOnce({
        data: {
          messages: 0,
        },
      });
      // Act
      const response = await service.checkStatus();

      // Assert
      expect(userConfigServiceSpy).toHaveBeenCalledWith(
        'secrets.rabbitmq.username',
      );
      expect(userPasswordConfigServiceSpy).toHaveBeenCalledWith(
        'secrets.rabbitmq.password',
      );
      expect(axiosSpy).toHaveBeenCalledWith(
        `http://localhost:15672/api/queues/%2F/jobs_queue`,
        {
          auth: {
            username: mockUsername,
            password: mockPassword,
          },
        },
      );
      expect(response).toEqual(true);
    });
  });
});
