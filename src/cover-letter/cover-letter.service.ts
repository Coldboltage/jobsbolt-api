import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CoverLetter } from './entities/cover-letter.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { JobService } from '../job/job.service';
import { UtilsService } from '../utils/utils.service';
import { BatchStatusEnum, BatchType } from '../batch/entity/batch.entity';
import { BatchService } from '../batch/batch.service';

@Injectable()
export class CoverLetterService {
  constructor(
    @InjectRepository(CoverLetter)
    private coverLetterRepository: Repository<CoverLetter>,
    private jobService: JobService,
    private utilService: UtilsService,
    private batchService: BatchService,
  ) { }
  async create(createCoverLetterDto: CreateCoverLetterDto) {
    const jobEntity = await this.jobService.findOne(
      createCoverLetterDto.indeedId,
    );

    if (jobEntity.coverLetter !== null)
      throw new ConflictException('cover_letter_already_exists');

    return this.coverLetterRepository.save({
      userPitch: createCoverLetterDto.userPitch,
      job: jobEntity,
    });
  }

  async createBatchCoverLetter() {
    const newCoverLetters = await this.coverLetterRepository.find({
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
      },
    });

    const response = await this.utilService.buildJsonLd(
      newCoverLetters,
      'cover',
    );

    if (response === null) {
      console.log('no jobs available for buildJsonLd');
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

  // Create BatchJSON Data

  findAll() {
    return `This action returns all coverLetter`;
  }

  findOne(id: number) {
    return `This action returns a #${id} coverLetter`;
  }

  update(id: number, updateCoverLetterDto: UpdateCoverLetterDto) {
    return `This action updates a #${id} coverLetter`;
  }

  remove(id: number) {
    return `This action removes a #${id} coverLetter`;
  }
}
