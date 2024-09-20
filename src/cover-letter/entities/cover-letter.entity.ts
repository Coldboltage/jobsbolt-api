import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Job } from '../../job/entities/job.entity';

@Entity()
export class CoverLetter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userPitch: string;

  @Column({ nullable: true })
  generatedCoverLetter: string;

  @OneToOne(() => Job, (job) => job.coverLetter)
  job: Job;
}
