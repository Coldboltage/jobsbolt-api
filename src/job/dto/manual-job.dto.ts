import { IsBoolean, IsString } from 'class-validator';
import { ManualJobInfoInterface } from '../entities/job.entity';

export class ManualJobDto implements ManualJobInfoInterface {
  @IsString()
  indeedId: string;
  @IsString()
  jobTypeId: string;
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsString()
  pay: string;
  @IsString()
  location: string;
  @IsString()
  companyName: string;
  @IsBoolean()
  manual: boolean;
  @IsString()
  link: string;
}