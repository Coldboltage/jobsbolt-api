import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CompleteCoverParse,
  CoverLetter,
  ParsedJobContent,
} from './entities/cover-letter.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { JobService } from '../job/job.service';
import { UtilsService } from '../utils/utils.service';
import { BatchStatusEnum, BatchType } from '../batch/entity/batch.entity';
import { BatchService } from '../batch/batch.service';
import { Cron } from '@nestjs/schedule';
import { IndividualJobFromBatch } from '../job/entities/job.entity';

@Injectable()
export class CoverLetterService {
  constructor(
    @InjectRepository(CoverLetter)
    private coverLetterRepository: Repository<CoverLetter>,
    private jobService: JobService,
    private utilService: UtilsService,
    private batchService: BatchService,
  ) { }

  @Cron('*/10 * * * * *')
  async checkCoverBatches() {
    // Get all the successfully completed batches
    const allResponses = await this.batchService.checkPendingBatches(
      BatchType.COVER,
    );
    if (!allResponses) return;
    for (const cover of allResponses) {
      const completeJob = this.processCoverObject(cover);
      await this.updateFromCompleteCoverParse(completeJob);
    }
  }

  processCoverObject(cover: IndividualJobFromBatch): CompleteCoverParse {
    const coverId = cover.custom_id;
    const content: ParsedJobContent = JSON.parse(
      cover.response.body.choices[0].message.content,
    );
    const coverLetter = content.cover_letter;

    const object: CompleteCoverParse = {
      coverId,
      cover_letter: coverLetter,
    };

    return object;
  }

  async create(createCoverLetterDto: CreateCoverLetterDto) {
    const jobEntity = await this.jobService.findOne(createCoverLetterDto.jobId);

    if (jobEntity.coverLetter !== null)
      throw new ConflictException('cover_letter_already_exists');

    return this.coverLetterRepository.save({
      userPitch: createCoverLetterDto.userPitch,
      job: jobEntity,
    });
  }

  async createBatchCover() {
    const newCovers = await this.findCoverLettersToGenerate();

    // update scans for jobs
    newCovers.forEach((cover) => (cover.batch = true));

    if (!newCovers || newCovers.length === 0) {
      console.log('no qualifying covers');
      return null;
    }
    const updatedNewCovers = await this.coverLetterRepository.save(newCovers);

    const response = await this.utilService.buildJsonLd(
      updatedNewCovers,
      'cover',
    );

    if (response === null) {
      console.log('no covers available for buildJsonLd');
      return;
    }
    const batch = await this.utilService.openAISendJSON('cover');
    await this.batchService.create({
      id: batch.id,
      status: BatchStatusEnum.VALIDATING,
      filename: batch.input_file_id,
      type: BatchType.COVER,
    });
  }

  async findCoverLettersToGenerate() {
    return this.coverLetterRepository.find({
      relations: {
        job: {
          jobType: {
            user: true,
          },
        },
      },
      where: {
        generatedCoverLetter: IsNull(),
        userPitch: Not(IsNull()),
        batch: false,
        job: {
          suited: true,
        },
      },
    });
  }

  findAll() {
    return `This action returns all coverLetter`;
  }

  findOne(id: number) {
    return `This action returns a #${id} coverLetter`;
  }

  update(id: number, updateCoverLetterDto: UpdateCoverLetterDto) {
    return `This action updates a #${id} coverLetter`;
  }

  async updateFromCompleteCoverParse(completeJob: CompleteCoverParse) {
    return this.coverLetterRepository.update(
      { id: completeJob.coverId },
      { generatedCoverLetter: completeJob.cover_letter },
    );
  }

  remove(id: number) {
    return `This action removes a #${id} coverLetter`;
  }
}
