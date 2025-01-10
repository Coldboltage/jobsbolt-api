import { Entity, PrimaryColumn, ManyToOne } from 'typeorm';
import { JobType } from './job-type.entity';
import { Job } from '../../job/entities/job.entity';

@Entity('job_type_jobs_job') // Map to the existing table
export class JobTypeJobsJob {
  @PrimaryColumn('uuid') // Composite key part 1
  jobTypeId: string;

  @PrimaryColumn('uuid') // Composite key part 2
  jobId: string;

  @ManyToOne(() => JobType, (jobType) => jobType.jobTypeJobsJob, { onDelete: 'CASCADE' })
  jobType: JobType;

  @ManyToOne(() => Job, (job) => job.jobTypeJobsJob, { onDelete: 'CASCADE' })
  job: Job;
}