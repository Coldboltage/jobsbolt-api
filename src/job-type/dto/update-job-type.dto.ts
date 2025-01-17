import { PartialType } from '@nestjs/mapped-types';
import { CreateJobTypeDto } from './create-job-type.dto';
import { IsDate, IsOptional } from 'class-validator';

export class UpdateJobTypeDto extends PartialType(CreateJobTypeDto) {
  @IsDate()
  @IsOptional()
  nextScan: Date
}
