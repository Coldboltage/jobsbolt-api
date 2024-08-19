import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Batch {
  @PrimaryColumn()
  id: string;

  @Column()
  status: BatchStatusEnum;

  @Column()
  filename: string;
}

export enum BatchStatusEnum {
  VALIDATING = 'validating',
  FAILED = 'failed',
  IN_PROGRESS = 'in_progress	',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}
