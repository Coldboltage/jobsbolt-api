import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { JobInfoInterface } from '../entities/job.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ type: [JobInfoInterface] }) // Specify the type for Swagger
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobInfoInterface)
  jobs: JobInfoInterface[];
}
