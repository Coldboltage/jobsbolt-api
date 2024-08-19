import { IsEnum, IsString } from 'class-validator';
import { BatchStatusEnum } from '../entity/batch.entity';

export class CreateBatchDto {
  @IsString()
  id: string;

  @IsEnum(BatchStatusEnum)
  status: BatchStatusEnum;

  @IsString()
  filename: string;
}
