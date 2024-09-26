import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { JobType } from '../../job-type/entities/job-type.entity';
import { Role } from '../../auth/role.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ nullable: true })
  cv: string;

  @Column({ nullable: true })
  discordId: string;

  @Column({ nullable: true })
  description: string; // User talks about themself and what they think of themselves and their CV, what they aim to do

  @Column({ nullable: true })
  baseCoverLetter: string;

  @Column({ nullable: true })
  userTalk: string;

  @Column({ type: 'simple-array', nullable: true })
  roles: Role[];

  @OneToMany(() => JobType, (jobType) => jobType.user, { eager: true })
  jobType: JobType[];
}

export interface SlimUser {
  id: string;
  name: string;
  email: string;
  date: Date;
  roles: Role[];
}
