import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Job } from '../../job/entities/job.entity';
import { PayUnits } from '../types';

@Entity()
@Unique(['name', 'location', 'user']) // Prevent duplicate JobType entries for the same user with identical name and location
export class JobType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  location: string;

  @ManyToOne(() => User, (user) => user.jobType)
  user: User;

  @ManyToMany(() => Job, (job) => job.jobType)
  @JoinTable()
  jobs: Job[];

  @Column()
  date: Date;

  @Column({ nullable: true })
  nextScan: Date;

  @Column()
  active: boolean;

  // This section determines what a user wants in this jobType mission

  @Column()
  desiredPay: number;

  @Column({ nullable: true })
  desiredPayUnit: PayUnits;

  @Column({ nullable: true })
  description: string; // What the user is essentially looking for within a job

  // Management

  @Column('timestamp', { nullable: true })
  updatedLast?: Date;
}
