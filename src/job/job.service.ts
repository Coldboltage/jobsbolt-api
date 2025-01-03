import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  In,
  IsNull,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import {
  CompleteJobParse,
  IndividualJobFromBatch,
  Job,
  JobInfoInterface,
  ParsedJobContent,
} from './entities/job.entity';
import { JobTypeService } from '../job-type/job-type.service';
import { ConfigService } from '@nestjs/config';
import { BatchService } from '../batch/batch.service';
import { Cron } from '@nestjs/schedule';
import { BatchStatusEnum, BatchType } from '../batch/entity/batch.entity';
import { UserService } from '../user/user.service';
import { DiscordService } from '../discord/discord.service';

import { UtilsService } from '../utils/utils.service';
import { CoverLetter } from '../cover-letter/entities/cover-letter.entity';
import { ManualJobDto } from './dto/manual-job.dto';
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
    private utilService: UtilsService,
  ) { }

  async onApplicationBootstrap() {
    const isTest = this.configService.get<string>('general.testBatch');
    const discordTest = this.configService.get<string>('general.discordTest');
    console.log(isTest, discordTest);
    if (isTest === 'true') {
      await this.createBatchJob();
    }
    if (discordTest === 'true') {
      console.log('discord test activated');
      await this.sendDiscordNewJobMessage();
    }
  }

  async createBatchJob() {
    const newJobs = await this.scanAvailableJobs();

    // update scans for jobs
    newJobs.forEach((job) => (job.scannedLast = new Date()));

    if (!newJobs || newJobs.length === 0) {
      console.log("no new jobs")
      return null;
    }
    console.log("new jobs found adding them")
    const updatedNewJobs = await this.jobRepository.save(newJobs);

    await this.utilService.buildJsonLd(updatedNewJobs, 'job');

    const batch = await this.utilService.openAISendJSON('job');
    await this.batchService.create({
      id: batch.id,
      status: BatchStatusEnum.VALIDATING,
      filename: batch.input_file_id,
      type: BatchType.JOB,
    });
  }

  @Cron('*/10 * * * * *')
  async checkJobBatches() {
    // Get all the successfully completed batches
    const allResponses = await this.batchService.checkPendingBatches(
      BatchType.JOB,
    );
    if (!allResponses || allResponses.length === 0) return;
    for (const job of allResponses) {
      const completeJob = this.processJobObject(job);
      await this.updateFromCompleteJobParse(completeJob);
    }
    await this.sendDiscordNewJobMessage();
  }

  processJobObject(job: IndividualJobFromBatch): CompleteJobParse {
    const indeedId = job.custom_id;
    const content: ParsedJobContent = JSON.parse(
      job.response.body.choices[0].message.content,
    );
    const summary = content.analysis;
    const suited = content.is_suitable;
    const suitabilityScore = content.suitabilityScore;
    const conciseDescription = content.conciseDescription;
    const conciseSuited = content.conciseSuited;

    const object: CompleteJobParse = {
      indeedId,
      summary,
      suited,
      suitabilityScore,
      conciseDescription,
      conciseSuited,
    };

    return object;
  }

  async addJobsByBot(
    jobTypeId: string,
    scrappedJobs: JobInfoInterface[],
  ): Promise<void> {
    // // All jobs rekate to a jobType
    console.log(jobTypeId)
    console.log(scrappedJobs.length)
    const jobTypeEntity = await this.jobTypeService.findOne(jobTypeId);
    // Check which jobs exist already
    const allJobsIds = scrappedJobs.map((scrappedJob) => scrappedJob.indeedId);

    // All Jobs currently in database checked and retrieved
    const existingJobRecords = await this.jobRepository.find({
      where: { indeedId: In(allJobsIds) },
      relations: {
        jobType: true,
      },
    });

    const existingJobs = existingJobRecords.filter((existingJob) =>
      scrappedJobs.some((scrappedJob) => {
        // Check if job exists
        return existingJob.indeedId === scrappedJob.indeedId;
      }),
    );

    const existingJobsDifferentJobType = existingJobs.filter((existingJob) =>
      existingJob.jobType.every((jobType) => {
        return jobType.id !== jobTypeEntity.id;
      }),
    ); // Ensure it's not the same jobType

    const returnupdatedExistingJobAndType = [];

    if (existingJobsDifferentJobType.length > 0) {
      console.log('adding existing job');
      for (const existingJob of existingJobsDifferentJobType) {
        existingJob.jobType.push(jobTypeEntity);
        const updatedExistingJobAndType =
          await this.jobRepository.save(existingJob);
        console.log(
          `${updatedExistingJobAndType.indeedId} jobType pushed and updated`,
        );
        returnupdatedExistingJobAndType.push(updatedExistingJobAndType);
      }
      // return returnupdatedExistingJobAndType;
    }

    const newJobs = scrappedJobs.filter((scrappedJob) => {
      return existingJobRecords.every((existingJob) => {
        return existingJob.indeedId !== scrappedJob.indeedId;
      });
    });

    console.log(`Scrapped Jobs: ${scrappedJobs.length}`);
    console.log(`New Jobs: ${newJobs.length}`);

    // Create all jobs
    for (const job of newJobs) {
      console.log('array for newJobs');
      const jobEntity = await this.jobRepository.save({
        indeedId: job.indeedId,
        link: `https://www.indeed.com/viewjob?jk=${job.indeedId}`,
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
      console.log(jobEntity);
      console.log(`${jobEntity.indeedId} added`);
    }
    return;
  }

  async addJobManually(manualJobDto: ManualJobDto): Promise<Job> {
    const checkJobLink = await this.jobRepository.findOne({
      where: {
        jobType: {
          id: manualJobDto.jobTypeId,
        },
        link: manualJobDto.link,
      },
      relations: {
        jobType: true,
      },
    });

    if (checkJobLink) {
      throw new ConflictException('job_already_exists');
    }

    console.log(checkJobLink);

    const jobEntity = await this.jobTypeService.findOne(manualJobDto.jobTypeId);

    return this.jobRepository.save({
      indeedId: manualJobDto.indeedId,
      link: manualJobDto.link,
      name: manualJobDto.name,
      date: new Date(),
      description: manualJobDto.description,
      pay: manualJobDto.pay,
      location: manualJobDto.location,
      suited: false,
      jobType: [jobEntity],
      scannedLast: null,
      companyName: manualJobDto.companyName,
      manual: true,
    });
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

  async sendDiscordNewJobMessage(): Promise<void> {
    const users = await this.userService.findUsersWithUnsendSuitableJobs();
    console.log(users);
    for (const user of users) {
      const bestJobs = await this.findUsersBestFiveJobs(user.id);
      const manualJobs = await this.findUserManualJobs(user.id);
      const allJobs = [...bestJobs, ...manualJobs];
      allJobs.forEach((job) => (job.notification = true));
      await this.jobRepository.save(allJobs);
      if (user.discordId) {
        this.discordService.sendMessage(user.discordId, allJobs);
      }
    }
  }

  async sendDiscordNewJobMessageToUser(id: string): Promise<void> {
    const allJobs = await this.findUsersBestFiveJobs(id);
    allJobs.forEach((job) => (job.notification = true));
    await this.jobRepository.save(allJobs);
    if (allJobs.length === 0 || !allJobs[0].jobType[0].user.discordId) return;
    this.discordService.sendMessage(
      allJobs[0].jobType[0].user.discordId,
      allJobs,
    );
  }

  async findAll() {
    return this.jobRepository.find({});
  }

  async findOne(jobId: string) {
    return this.jobRepository.findOne({
      relations: {
        coverLetter: true,
        jobType: {
          user: true,
        },
      },
      where: {
        id: jobId,
      },
    });
  }

  async findAllSuitableJobs(id: string) {
    const allSuitedJobs = await this.jobRepository.find({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: id,
          },
        },
        suited: true,
      },
    });
    return allSuitedJobs;
  }

  async findAllUserUnsendJobs(id: string): Promise<Job[]> {
    const allJobsToSend = await this.jobRepository.find({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: id,
          },
        },
        suited: true,
        notification: false,
      },
    });
    return allJobsToSend;
  }

  async findAllAppliedJobs(id: string, state: boolean) {
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
            id: id,
          },
        },
      },
    });
  }

  async findAllCoverLetterToApply(id: string): Promise<DeepPartial<Job[]>> {
    const jobsToApplyEntity = await this.jobRepository.find({
      where: {
        interested: true,
        applied: false,
        suited: true,
        coverLetter: {
          batch: true,
          generatedCoverLetter: Not(IsNull()),
        },
        jobType: {
          user: {
            id: id,
          },
        },
      },
      relations: {
        coverLetter: true,
        jobType: {
          user: true,
        },
      },
    });
    if (!jobsToApplyEntity || jobsToApplyEntity.length === 0)
      throw new NotFoundException('no_cover_letters_ready');

    const result = jobsToApplyEntity.map((job) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { jobType, ...rest } = job;
      return rest;
    });
    return result;
  }

  async sendUserNewJobs(id: string) {
    const allJobsToSend = await this.findAllUserUnsendJobs(id);
    allJobsToSend.forEach((job) => (job.notification = true));
    await this.jobRepository.save(allJobsToSend);
    return allJobsToSend;
  }

  async findUsersBestFiveJobs(id): Promise<Job[]> {
    return this.jobRepository.find({
      order: {
        suitabilityScore: 'DESC',
      },
      take: 5,
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: id,
          },
        },
        suitabilityScore: MoreThanOrEqual(85),
        suited: true,
        notification: false,
      },
    });
  }

  async findUserManualJobs(id): Promise<Job[]> {
    return this.jobRepository.find({
      order: {
        suitabilityScore: 'DESC',
      },
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: id,
          },
        },
        manual: true,
        notification: false,
      },
    });
  }

  async jobInterestState(id, jobId, interestedState): Promise<Job> {
    const jobEntity = await this.jobRepository.findOne({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: id,
          },
        },
        id: jobId,
      },
    });
    jobEntity.interested = interestedState;
    return this.jobRepository.save(jobEntity);
  }

  async findAllJobsNotifiedPendingInterest(id: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: {
        notification: true,
        interested: IsNull(),
        applied: false,
        jobType: {
          user: {
            id: id,
          },
        },
        coverLetter: {
          generatedCoverLetter: null,
        },
      },
      relations: {
        jobType: {
          user: true,
        },
        coverLetter: true,
      },
    });
  }

  async findAllInterestedJobsByUser(id: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: {
        notification: true,
        suited: true,
        interested: true,
        applied: false,
        jobType: {
          user: {
            id: id,
          },
        },
        coverLetter: {
          generatedCoverLetter: IsNull(),
          userPitch: IsNull(),
        },
      },
      relations: {
        jobType: {
          user: true,
        },
        coverLetter: true,
      },
    });
  }

  async resetFalse(id: string) {
    const allFalseJobs = await this.jobRepository.find({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        jobType: {
          user: {
            id: id,
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
      { indeedId: completeJob.indeedId },
      {
        summary: completeJob.summary,
        suited: completeJob.suited,
        suitabilityScore: completeJob.suitabilityScore,
        conciseDescription: completeJob.conciseDescription,
        scannedLast: new Date(),
        conciseSuited: completeJob.conciseSuited,
      },
    );
  }

  async updateJobApplication(
    id: string,
    indeedId: string,
    status: boolean,
  ) {
    const jobEntity = await this.jobRepository.findOne({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        indeedId,
        jobType: {
          user: {
            id: id,
          },
        },
      },
    });

    jobEntity.applied = status;
    return this.jobRepository.save(jobEntity);
  }
}
