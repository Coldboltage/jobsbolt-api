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
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
  UpdateResult,
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
import { Role } from '../auth/role.enum';
import { countTokens } from 'gpt-tokenizer';
import { User } from '../user/entities/user.entity';
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

  async jobsAfterCredit(users: User[]): Promise<Job[]> {
    const totalJobs: Job[] = [];
    for (const user of users) {
      const { description, cv, userTalk, credit } = user;
      const combineText = `${description} ${cv} ${userTalk}`;

      const amountUserTokens = countTokens(combineText);
      console.log(amountUserTokens);
      const inputPrice = 1.25 / 1000000;
      const amountUserTokensInPounds = amountUserTokens * inputPrice;

      const outputPrice = 5.0 / 1000000;
      const amountOutputTokens = 1000 / outputPrice;

      const totalPrice = amountUserTokensInPounds + amountOutputTokens;

      const flatMapJobs = user.jobType;
      const uniqueJobs = Array.from(
        new Set(flatMapJobs[0].jobs.filter((job) => job.scannedLast !== null)),
      );
      let creditRemaining = credit;

      for (const job of uniqueJobs) {
        if (creditRemaining <= 2.5) {
          // The user does not have enough credit anymore. They still have available jobs, but lack the funds.
          await this.userService.update(user.id, { credit: creditRemaining });
          break;
        }
        totalJobs.push(job);
        creditRemaining -= totalPrice;
      }
      // The user has scanned all the jobs and has remaining cash, therefore no more availableJobs.
      await this.userService.update(user.id, {
        credit: creditRemaining,
        availableJobs: false,
      });
    }
    return totalJobs;
  }

  async createBatchJob() {
    // // THIS WILL BE USED IN THE FUTURE WHENEVER WE HAVE USER CREDITS SORTED. NEEDS TO BE EXTENSIVELY TESTED
    // Get all users which need to be scanned
    // const unscannedUsers = await this.userService.findAllUnscannedJobsUsers(); // Needs to be checked
    // Get only the amount of jobs needed and calculate
    // const availableJobs = await this.jobsAfterCredit(unscannedUsers);

    // Old Version
    const availableJobs = await this.scanAvailableJobs();

    // update scans for jobs
    availableJobs.forEach((job) => (job.scannedLast = new Date()));

    if (!availableJobs || availableJobs.length === 0) {
      console.log('no new jobs');
      return null;
    }
    console.log('availableJobs found adding them');
    const updatedNewJobs = await this.jobRepository.save(availableJobs);

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
    const jobId = job.custom_id;
    const content: ParsedJobContent = JSON.parse(
      job.response.body.choices[0].message.content,
    );
    const summary = content.analysis;
    const suited = content.is_suitable;
    const suitabilityScore = content.suitabilityScore;
    const conciseDescription = content.conciseDescription;
    const conciseSuited = content.conciseSuited;
    const { biggerAreaOfImprovement } = content;

    const object: CompleteJobParse = {
      jobId,
      summary,
      suited,
      suitabilityScore,
      conciseDescription,
      conciseSuited,
      biggerAreaOfImprovement,
    };

    return object;
  }

  async addJobsByBot(
    jobTypeId: string,
    scrappedJobs: JobInfoInterface[],
  ): Promise<void> {
    // // All jobs rekate to a jobType
    console.log(jobTypeId);
    console.log(scrappedJobs.length);
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
    let jobEntity: Job;
    for (const job of newJobs) {
      console.log('array for newJobs');
      jobEntity = await this.jobRepository.save({
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
        firstAdded: new Date(),
      });
      console.log(`${jobEntity.indeedId} added`);
    }
    await this.userService.update(jobTypeEntity.user.id, {
      availableJobs: true,
    });
    return;
  }

  async addJobManually(manualJobDto: ManualJobDto): Promise<Job> {
    console.log(manualJobDto);
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

    console.log(checkJobLink);
    if (checkJobLink) {
      throw new ConflictException('job_already_exists');
    }

    const jobEntity = await this.jobTypeService.findOne(manualJobDto.jobTypeId);

    const newJob = await this.jobRepository.save({
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
    await this.userService.update(jobEntity.user.id, {
      availableJobs: true,
    });

    return newJob;
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

    const acceptedUser = users.filter((user) => {
      if (
        user.roles.includes(Role.ADMIN) ||
        user.jobType.some((jobType) => jobType.nextScan === null)
      )
        return true;

      return user.jobType.some((jobType) => {
        if (jobType.nextScan === null) return true;
        const thresholdDate = new Date();
        thresholdDate.setHours(12, 0, 0, 0);
        return thresholdDate > jobType.nextScan;
      });
    });

    for (const user of acceptedUser) {
      const jobTypesForUser = user.jobType;

      const expiredJobTypeScans = jobTypesForUser.filter((jobType) => {
        if (jobType.nextScan === null) return true;
        const thresholdDate = new Date();
        thresholdDate.setHours(12, 0, 0, 0);
        return thresholdDate > jobType.nextScan;
      });

      const bestJobs = await this.findUsersBestFiveJobs(user.id);
      const manualJobs = await this.findUserManualJobs(user.id);
      const allJobs = [...bestJobs, ...manualJobs];
      allJobs.forEach((job) => (job.notification = true));
      await this.jobRepository.save(allJobs);
      if (user.discordId) {
        this.discordService.sendMessage(user.discordId, allJobs);
      }
      const updatePromiseList: Promise<UpdateResult>[] = [];

      for (const jobType of expiredJobTypeScans) {
        console.error('hello alan');
        const nextScan = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
        console.log();
        nextScan.setHours(12, 0, 0, 0);
        console.log(nextScan.toISOString());
        updatePromiseList.push(
          this.jobTypeService.update(jobType.id, { nextScan }),
        );
      }

      await Promise.all(updatePromiseList);
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
      order: {
        suitabilityScore: 'DESC',
        name: 'ASC',
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
      select: {
        companyName: true,
        name: true,
        location: true,
        notification: true,
        applied: true,
        interested: true,
        id: true,
        jobType: {
          name: true,
          user: {
            id: true,
            email: true,
            name: true,
          },
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

  async findUsersBestFiveJobs(id: string): Promise<Job[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 14);
    const test = await this.jobRepository.find({
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
          active: true,
          user: {
            id,
          },
        },
        suitabilityScore: MoreThanOrEqual(65),
        suited: true,
        notification: false,
        firstAdded: MoreThan(thresholdDate),
      },
    });
    for (const job of test) {
      console.log(`Threshold Date: ${thresholdDate}`);
      console.log(`Job firstAdded Date: ${job.firstAdded}`);
      console.log(
        `Is Job firstAdded date greater than threshold: ${new Date(job.firstAdded) > thresholdDate}`,
      );
    }

    return test;
  }

  async findUserManualJobs(id: string): Promise<Job[]> {
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

  async findUserRecentJobs(userId: string): Promise<Job[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 14);
    const recentJobs = await this.jobRepository.find({
      relations: {
        jobType: {
          user: true,
        },
      },
      where: {
        scannedLast: MoreThan(thresholdDate),
        jobType: {
          user: {
            id: userId,
          },
        },
      },
      order: {
        suitabilityScore: 'DESC',
        name: 'ASC',
      },
    });
    return recentJobs;
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
      select: {
        companyName: true,
        name: true,
        location: true,
        notification: true,
        applied: true,
        interested: true,
        id: true,
        jobType: {
          name: true,
          user: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      order: {
        suitabilityScore: 'DESC',
        name: 'ASC',
      },
    });
  }

  async findAllJobsNotifiedPendingInterestSlim(id: string): Promise<Job[]> {
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
      },
      select: {
        companyName: true,
        name: true,
        location: true,
        notification: true,
        applied: true,
        interested: true,
        id: true,
        jobType: {
          name: true,
          user: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      order: {
        suitabilityScore: 'DESC',
        name: 'ASC',
      },
    });
  }

  async findAllInterestedJobsByUser(id: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: {
        notification: true,
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
      select: {
        companyName: true,
        name: true,
        location: true,
        notification: true,
        applied: true,
        id: true,
        interested: true,
        jobType: {
          name: true,
          user: {
            id: true,
            email: true,
            name: true,
          },
        },
        coverLetter: {
          id: true,
        },
      },
      order: {
        suitabilityScore: 'DESC',
        name: 'ASC',
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
      { id: completeJob.jobId },
      {
        summary: completeJob.summary,
        suited: completeJob.suited,
        suitabilityScore: completeJob.suitabilityScore,
        conciseDescription: completeJob.conciseDescription,
        scannedLast: new Date(),
        conciseSuited: completeJob.conciseSuited,
        biggerAreaOfImprovement: completeJob.biggerAreaOfImprovement,
      },
    );
  }

  async updateJobApplication(id: string, indeedId: string, status: boolean) {
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
    jobEntity.appliedDate = new Date();
    return this.jobRepository.save(jobEntity);
  }

  async resetAILookup(userId: string) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 14);
    return this.jobRepository.find({
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
        notification: false,
        scannedLast: MoreThan(thresholdDate),
      },
      select: {
        id: true,
        firstAdded: true,
        scannedLast: true,
        jobType: {
          id: true,
          user: {
            id: true,
          },
        },
      },
    });
  }

  async findMostRecentAppliedJobs(userid: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: {
        jobType: {
          user: {
            id: userid,
          },
        },
        applied: true,
      },
      order: {
        appliedDate: 'DESC',
      },
      take: 15,
    });
  }

  async resetSelectedJobs(jobs: Job[]) {
    jobs.forEach((job) => {
      job.scannedLast = null;
      job.firstAdded = job.firstAdded === null ? new Date() : job.firstAdded;
    });
    return this.jobRepository.save(jobs);
  }

  async resetAILookupFullRun(userId: string) {
    const resetJobs = await this.resetAILookup(userId);
    return this.resetSelectedJobs(resetJobs);
  }
}
