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
@Unique(['name', 'location']) // We don't wannt the name and location to be the same. Wasteful
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
