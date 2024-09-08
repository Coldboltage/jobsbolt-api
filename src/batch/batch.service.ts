import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Batch, BatchStatusEnum } from './entity/batch.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IndividualJobFromBatch } from '../job/entities/job.entity';

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(Batch) private batchRepository: Repository<Batch>,
    private configService: ConfigService,
  ) { }

  private openai = new OpenAI(this.configService.get('secrets.OPENAI_API_KEY'));

  async create(createBatchDto: CreateBatchDto) {
    return this.batchRepository.save(createBatchDto);
  }

  async getPendingBatchJobs(): Promise<Batch[]> {
    return this.batchRepository.find({
      where: [
        { status: BatchStatusEnum.VALIDATING },
        { status: BatchStatusEnum.IN_PROGRESS },
        { status: BatchStatusEnum.FINALIZING },
      ],
    });
  }

  // We've got all the batch jobs, now check if they are available
  async checkPendingBatchJobs(): Promise<IndividualJobFromBatch[]> {
    const pendingBatchJobs = await this.getPendingBatchJobs();
    for (const batch of pendingBatchJobs) {
      console.log('Checking for jobs');
      console.log(batch)
      const batchStatus = await this.openai.batches.retrieve(batch.id);
      console.log(batchStatus)
      // IF completed
      const finishedBatchJobs: IndividualJobFromBatch[] = [];
      if (batchStatus.status === BatchStatusEnum.COMPLETED) {
        // Update batch entity
        await this.completed(batch.id);
        // Get the file
        const finishedBatch = await this.grabCompletedBatchFile(batchStatus);
        finishedBatchJobs.push(...finishedBatch);
      }
      // Rest of jobs are still going on
      console.log(finishedBatchJobs);
      return finishedBatchJobs;
    }
  }

  async grabCompletedBatchFile(
    batch: OpenAI.Batches.Batch,
  ): Promise<IndividualJobFromBatch[]> {
    const file = await this.openai.files.content(batch.output_file_id);
    const fileContent = await file.text();

    // console.log(file)
    console.log(batch.input_file_id);

    // JSON String needing seperated
    const stringJobs = fileContent.split('\n');

    const jsonArray: IndividualJobFromBatch[] = stringJobs
      .map((line) => {
        if (line.trim()) {
          return JSON.parse(line);
        }
      })
      .filter(Boolean);

    // The batch file JSON is now an array of JSON completed jobs.
    console.log('grabCompletedBatchFile complete')
    return jsonArray;
  }

  async completed(id: string) {
    return this.batchRepository.update(
      { id },
      { status: BatchStatusEnum.COMPLETED },
    );
  }
}
