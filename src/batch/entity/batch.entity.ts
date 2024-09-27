import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Batch {
  @PrimaryColumn()
  id: string;

  @Column()
  status: BatchStatusEnum;

  @Column()
  filename: string;

  @Column()
  type: BatchType;
}

export enum BatchStatusEnum {
  VALIDATING = 'validating',
  FAILED = 'failed',
  IN_PROGRESS = 'in_progress	',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum BatchType {
  COVER = 'COVER',
  JOB = 'JOB',
}
