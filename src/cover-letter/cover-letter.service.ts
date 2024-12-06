import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CompleteCoverParse,
  CoverLetter,
  ParsedJobContent,
} from './entities/cover-letter.entity';
import { In, IsNull, Not, Repository } from 'typeorm';
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

  /**
   * Cron job to check for completed cover letter batches every 10 seconds.
   *
   * Checks the batch service to see if any cover letter batches are pending.
   * If a batch is available, retrieves information from the batch JSON provided by OpenAI.
   * The retrieved information is processed to extract the cover letter and update the cover letter record in the database.
   */
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

  /**
   * Processes the cover object from a batch and extracts the cover letter.
   *
   * @param {IndividualJobFromBatch} cover - The cover batch information to process.
   * @returns {CompleteCoverParse} An object containing the cover ID and the extracted cover letter.
   */
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

  /**
   * Creates a new cover letter for a specified job. First Step
   *
   * @param {CreateCoverLetterDto} createCoverLetterDto - The DTO containing the data needed to create a cover letter.
   * @returns {Promise<CoverLetter>} The created cover letter entity.
   * @throws {ConflictException} If a cover letter already exists for the specified job.
   */
  async create(createCoverLetterDto: CreateCoverLetterDto) {
    const jobEntity = await this.jobService.findOne(createCoverLetterDto.jobId);

    if (jobEntity.coverLetter !== null)
      throw new ConflictException('cover_letter_already_exists');

    return this.coverLetterRepository.save({
      userPitch: createCoverLetterDto.userPitch,
      job: jobEntity,
    });
  }

  /**
   * Creates a batch of qualifying cover letters for processing. 2nd Step
   *
   * Step prerequisite:
   * Ensure a cover letter has been created using the `create` method.
   * The cover letter must meet the following qualifying conditions:
   * - `generatedCoverLetter` must be null.
   * - `userPitch` must not be null.
   * - `batch` must be false.
   * - The associated job must be marked as `suited` (`job.suited` must be true).
   *
   * @returns {Promise<void | null>} Returns `null` if no qualifying cover letters are found.
   */
  @Cron('0 */1 * * *')
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

  /**
   * Finds all cover letters that are eligible for batch generation.
   *
   * Eligible conditions:
   * - The `generatedCoverLetter` must be null (cover letter not yet generated).
   * - The `userPitch` must not be null.
   * - The cover letter must not already be in a batch (`batch` is false).
   * - The associated job must be marked as suited (`job.suited` is true).
   *
   * @returns {Promise<CoverLetter[]>} A list of qualifying cover letters.
   */
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

  async resetCvs(userId: string, cvIds: string[]): Promise<CoverLetter[]> {
    const listOfCvs = await this.coverLetterRepository.find({
      relations: {
        job: {
          jobType: {
            user: true,
          },
        },
      },
      where: {
        job: {
          jobType: {
            user: {
              id: userId,
            },
          },
        },
        generatedCoverLetter: Not(IsNull()),
        batch: true,
        id: In(cvIds),
      },
    });

    listOfCvs.forEach((cv) => {
      cv.generatedCoverLetter = null;
      cv.batch = false;
    });

    return this.coverLetterRepository.save(listOfCvs);
  }

  /**
   * Updates the cover letter record in the database with the generated cover letter.
   *
   * @param {CompleteCoverParse} completeJob - The object containing the cover ID and generated cover letter.
   * @returns {Promise<UpdateResult>} The result of the update operation.
   */
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
