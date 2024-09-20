import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  CompleteJobParse,
  IndividualJobFromBatch,
  Job,
  JobInfoInterface,
  JobJson,
  ParsedContent,
} from './entities/job.entity';
import { JobTypeService } from '../job-type/job-type.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { BatchService } from '../batch/batch.service';
import { Cron } from '@nestjs/schedule';
import { BatchStatusEnum } from '../batch/entity/batch.entity';
import { UserService } from '../user/user.service';
import { DiscordService } from '../discord/discord.service';
const path = require('path');
const fs = require('fs');

@Injectable()
export class JobService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Job) private jobRepository: Repository<Job>,
    private jobTypeService: JobTypeService,
    private configService: ConfigService,
    private batchService: BatchService,
    private userService: UserService,
    private discordService: DiscordService,
  ) { }

  async onApplicationBootstrap() {
    const isTest = this.configService.get<string>('general.testBatch');
    const discordTest = this.configService.get<string>('general.discordTest');
    if (isTest === 'true') {
      await this.createBatchJob();
    }
    if (discordTest === 'true') {
      console.log('discord test activated');
      await this.sendDiscordNewJobMessage();
    }
  }

  async createBatchJob() {
    const response = await this.buildJsonLd();
    if (response === null) {
      console.log('no jobs available for buildJsonLd');
      return;
    }
    const batch = await this.openAISendJSON();
    await this.batchService.create({
      id: batch.id,
      status: BatchStatusEnum.VALIDATING,
      filename: batch.input_file_id,
    });
  }

  @Cron('*/10 * * * * *')
  async checkBatches() {
    // Get all the successfully completed batches
    const allResponses = await this.batchService.checkPendingBatchJobs();
    if (!allResponses) return;
    for (const job of allResponses) {
      const completeJob = this.processJobObject(job);
      await this.updateFromCompleteJobParse(completeJob);
    }
    await this.sendDiscordNewJobMessage();
  }

  processJobObject(job: IndividualJobFromBatch): CompleteJobParse {
    const jobId = job.custom_id;
    const content: ParsedContent = JSON.parse(
      job.response.body.choices[0].message.content,
    );
    const summary = content.analysis;
    const suited = content.is_suitable;
    const conciseDescription = content.conciseDescription;
    const conciseSuited = content.conciseSuited;

    const object: CompleteJobParse = {
      jobId,
      summary,
      suited,
      conciseDescription,
      conciseSuited,
    };

    return object;
  }

  async addJobsByBot(jobTypeId: string, jobs: JobInfoInterface[]) {
    // // All jobs rekate to a jobType
    const jobTypeEntity = await this.jobTypeService.findOne(jobTypeId);
    console.log(jobTypeEntity);
    // Check which jobs exist already
    const allJobsIds = jobs.map((job) => job.jobId);

    // All Jobs currently in database checked and retrieved
    const existingJobRecords = await this.jobRepository.find({
      where: { jobId: In(allJobsIds) },
      relations: {
        jobType: true,
      },
    });

    const newJobs = jobs.filter((job) => {
      return !existingJobRecords.some((existingJob) => {
        return existingJob.jobId === job.jobId;
      });
    });

    const existingJobDifferentJobType = existingJobRecords.filter(
      (existingJob) =>
        jobs.some(
          (job) =>
            existingJob.jobId === job.jobId && // Check if the job IDs match
            !existingJob.jobType.some(
              (existingJobType) => existingJobType.id === jobTypeId,
            ), // Ensure it's not the same jobType
        ),
    );

    // const newJobs = await this.jobRepository
    //   .createQueryBuilder('job')
    //   .select('job.jobId')
    //   .where('job.jobId NOT IN (:...allJobsIds)', { allJobsIds })
    //   .andWhere('job.jobTypeId = :jobTypeId', { jobTypeId })
    //   .getMany();

    // Create all jobs
    for (const job of newJobs) {
      const jobEntity = await this.jobRepository.save({
        jobId: job.jobId,
        link: `https://www.indeed.com/viewjob?jk=${job.jobId}`,
        name: job.name,
        date: new Date(),
        description: job.description,
        pay: job.pay,
        location: job.location,
        suited: false,
        jobType: [jobTypeEntity],
        scannedLast: null,
        companyName: job.companyName,
      });
      console.log(`${jobEntity.jobId} added`);
    }

    if (existingJobDifferentJobType.length > 0) {
      console.log('adding existing job');
      for (const existingJob of existingJobDifferentJobType) {
        existingJob.jobType.push(jobTypeEntity);
        console.log(existingJob)
        const updatedExistingJobAndType =
          await this.jobRepository.save(existingJob);
        console.log(
          `${updatedExistingJobAndType.jobId} jobType pushed and updated`,
        );
      }
    }
  }

  async scanAvailableJobs(): Promise<Job[]> {
    // Find the jobs needed to be done
    const jobs = await this.jobRepository.find({
      where: {
        scannedLast: IsNull(),
      },
      relations: {
        jobType: {
          user: true,
        },
      },
    });
    return jobs;
  }

  async buildJsonLd(): Promise<Buffer> {
    // Get all the needed null jobs
    const newJobs = await this.scanAvailableJobs();

    // update scans for jobs
    newJobs.forEach((job) => (job.scannedLast = new Date()));

    if (!newJobs || newJobs.length === 0) {
      return null;
    }
    await this.jobRepository.save(newJobs);

    // House the JSON
    const jsonJobsArray = [];
    // Loop through
    for (const job of newJobs) {
      const jsonJob = this.buildJobJson(job);
      jsonJobsArray.push(jsonJob);
    }
    // Convert into JSONLD
    const jsonLFormatJobs = jsonJobsArray
      .map((job) => {
        console.log(job);
        return JSON.stringify(job);
      })
      .join('\n');
    // Create File
    // Write the JSON Lines to a file
    fs.writeFileSync(path.join(__dirname, 'requests.jsonl'), jsonLFormatJobs);
    return Buffer.from(jsonLFormatJobs, 'utf-8');
  }

  async openAISendJSON() {
    const openai = new OpenAI({
      apiKey: this.configService.get('secrets.openApiKey'),
    });

    const filePath = path.join(__dirname, 'requests.jsonl');

    if (fs.existsSync(filePath)) {
      console.log(`File found: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }

    const response = await openai.files.create({
      file: fs.createReadStream(path.join(__dirname, 'requests.jsonl')),
      purpose: 'batch',
    });

    console.log(response);

    const batch = await openai.batches.create({
      input_file_id: response.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
    });

    return batch;
  }

  createContentMessage(job: Job) {
    return `Here is a job I'm looking to apply for Job Description: ${job.description} Job Pay: ${job.pay} Job Location: ${job.location}. I wanted to know if it would suit me given the following cv: ${job.jobType[0].user.cv}. Here's also my personal descrption of myself and what I'm looking for: ${job.jobType[0].user.description}. The CV helps but the description gives a more recent telling of what the user is thinking.`;
  }

  buildJobJson(job: Job): JobJson {
    return {
      custom_id: job.jobId,
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
          { role: 'user', content: this.createContentMessage(job) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'job_analysis_schema', // Name the schema appropriately
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
              additionalProperties: false, // Prevent additional properties
            },
          },
        },
        max_tokens: 1000,
      },
    };
  }

  async sendDiscordNewJobMessage() {
    const users = await this.userService.findAllUserUnsendJobs();
    console.log(users);
    for (const user of users) {
      const allJobs = await this.sendUserNewJobs(user.id);
      await this.discordService.sendMessage(user.discordId, allJobs);
    }
  }

  async findAll() {
    return this.jobRepository.find({});
  }

  async findOne(jobId) {
    return this.jobRepository.findOne({
      relations: {
        jobType: true,
      },
      where: {
        id: jobId,
      },
    });
  }

  async findAllSuitableJobs(userId: string) {
    const allSuitedJobs = await this.jobRepository.find({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: userId,
          },
        },
        suited: true,
      },
    });
    console.log(allSuitedJobs.length);
    return allSuitedJobs;
  }

  async findAllUserUnsendJobs(userId: string): Promise<Job[]> {
    const allJobsToSend = await this.jobRepository.find({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: userId,
          },
        },
        suited: true,
        notification: false,
      },
    });
    return allJobsToSend;
  }

  async findAllAppliedJobs(userId: string, state: boolean) {
    return this.jobRepository.find({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        applied: state,
        jobType: {
          user: {
            id: userId,
          },
        },
      },
    });
  }

  async sendUserNewJobs(userId: string) {
    const allJobsToSend = await this.findAllUserUnsendJobs(userId);
    allJobsToSend.forEach((job) => (job.notification = true));
    await this.jobRepository.save(allJobsToSend);
    return allJobsToSend;
  }

  async resetFalse(userId: string) {
    const allFalseJobs = await this.jobRepository.find({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: userId,
          },
        },
        suited: false,
      },
    });
    allFalseJobs.forEach(async (job) => {
      job.scannedLast = null;
      await this.jobRepository.save(job);
    });
  }

  async updateFromCompleteJobParse(completeJob: CompleteJobParse) {
    return this.jobRepository.update(
      { jobId: completeJob.jobId },
      {
        summary: completeJob.summary,
        suited: completeJob.suited,
        conciseDescription: completeJob.conciseDescription,
        scannedLast: new Date(),
        conciseSuited: completeJob.conciseSuited,
      },
    );
  }

  async updateJobApplication(userId: string, jobId: string, status: boolean) {
    const jobEntity = await this.jobRepository.findOne({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobId,
        jobType: {
          user: {
            id: userId,
          },
        },
      },
    });

    jobEntity.applied = status;
    console.log(jobEntity);
    return this.jobRepository.save(jobEntity);
  }
}
