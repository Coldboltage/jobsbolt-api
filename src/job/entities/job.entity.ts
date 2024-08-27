import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { JobType } from '../../job-type/entities/job-type.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Job {
  @PrimaryGeneratedColumn('uuid') // Fairly sure we can't have two of the same jobId so we'll use this
  @ApiProperty()
  id: string;

  @Column()
  @ApiProperty()
  jobId: string;

  @Column({ default: false })
  @ApiProperty()
  applied: boolean;

  @Column()
  @ApiProperty()
  link: string; // Indeed link to the job in question

  @Column()
  @ApiProperty()
  name: string; // name of the job role

  @Column()
  @ApiProperty()
  companyName: string;

  @Column()
  @ApiProperty()
  date: Date; // After 30 days, we could probably delete the job? Not too sure how easy it'll be to get a closing

  @Column()
  @ApiProperty()
  description: string;

  @Column()
  @ApiProperty()
  pay: string;

  @Column()
  @ApiProperty()
  location: string;

  @Column({ nullable: true })
  @ApiProperty()
  summary: string;

  @Column({ nullable: true })
  @ApiProperty()
  conciseDescription: string;

  @Column({ nullable: true })
  @ApiProperty()
  conciseSuited: string;

  // Management

  @Column('boolean', { default: false })
  @ApiProperty()
  suited: boolean;

  @ManyToOne(() => JobType, (jobType) => jobType.jobs)
  @ApiProperty({ type: () => JobType })
  jobType: JobType;

  @Column('date', { nullable: true })
  @ApiProperty()
  scannedLast: Date;

  @Column({ default: false })
  @ApiProperty()
  notification: boolean;
}

export class JobInfoInterface {
  @ApiProperty({
    format: 'uuidv4',
    description: 'Unique Identifer for job record',
  })
  jobId: string;

  @ApiProperty()
  jobTypeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  pay: string;

  @ApiProperty()
  location: string;

  @ApiProperty()
  companyName: string;
}

export interface IndividualJobFromBatch {
  id: string;
  custom_id: string;
  response: IndividualJobFromBatchResponse;
  error: any;
}

export interface IndividualJobFromBatchResponse {
  status_code: number;
  request_id: string;
  body: IndividualJobFromBatchResponseBody;
}

export interface IndividualJobFromBatchResponseBody {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: IndividualJobFromBatchChoice[];
}

export interface IndividualJobFromBatchChoice {
  index: number;
  message: ChatCompletionMessage;
}

export interface ChatCompletionMessage {
  role: string;
  content: string;
}

export interface IndividualJobFromBatchResponseBody {
  analysis: string;
  is_suitable: boolean;
}

export interface CompleteJobParse {
  jobId: string;
  summary: string;
  suited: boolean;
  conciseDescription: string;
  conciseSuited: string;
}

export interface ParsedContent {
  analysis: string;
  is_suitable: boolean;
  conciseDescription: string;
  conciseSuited: string;
}
