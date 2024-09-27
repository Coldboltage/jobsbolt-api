import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
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
      return null;
    }
    const updatedNewJobs = await this.jobRepository.save(newJobs);

    await this.utilService.buildJsonLd(updatedNewJobs, 'job');

    // if (response === null) {
    //   console.log('no jobs available for buildJsonLd');
    //   return;
    // }

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
    if (!allResponses) return;
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
    const conciseDescription = content.conciseDescription;
    const conciseSuited = content.conciseSuited;

    const object: CompleteJobParse = {
      indeedId,
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
    const allJobsIds = jobs.map((job) => job.indeedId);

    // All Jobs currently in database checked and retrieved
    const existingJobRecords = await this.jobRepository.find({
      where: { indeedId: In(allJobsIds) },
      relations: {
        jobType: true,
      },
    });

    const newJobs = jobs.filter((job) => {
      return !existingJobRecords.some((existingJob) => {
        return existingJob.indeedId === job.indeedId;
      });
    });

    const existingJobDifferentJobType = existingJobRecords.filter(
      (existingJob) =>
        jobs.some(
          (job) =>
            existingJob.indeedId === job.indeedId && // Check if the job IDs match
            !existingJob.jobType.some(
              (existingJobType) => existingJobType.id === jobTypeId,
            ), // Ensure it's not the same jobType
        ),
    );

    // const newJobs = await this.jobRepository
    //   .createQueryBuilder('job')
    //   .select('job.indeedId')
    //   .where('job.indeedId NOT IN (:...allJobsIds)', { allJobsIds })
    //   .andWhere('job.jobTypeId = :jobTypeId', { jobTypeId })
    //   .getMany();

    // Create all jobs
    for (const job of newJobs) {
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
      console.log(`${jobEntity.indeedId} added`);
    }

    if (existingJobDifferentJobType.length > 0) {
      console.log('adding existing job');
      for (const existingJob of existingJobDifferentJobType) {
        existingJob.jobType.push(jobTypeEntity);
        console.log(existingJob);
        const updatedExistingJobAndType =
          await this.jobRepository.save(existingJob);
        console.log(
          `${updatedExistingJobAndType.indeedId} jobType pushed and updated`,
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

  async findOne(jobId: string) {
    return this.jobRepository.findOne({
      relations: {
        jobType: true,
        coverLetter: true,
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
      { indeedId: completeJob.indeedId },
      {
        summary: completeJob.summary,
        suited: completeJob.suited,
        conciseDescription: completeJob.conciseDescription,
        scannedLast: new Date(),
        conciseSuited: completeJob.conciseSuited,
      },
    );
  }

  async updateJobApplication(
    userId: string,
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
