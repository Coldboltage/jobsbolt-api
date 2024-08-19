import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { JobInfoInterface } from "../entities/job.entity";

export class CreateJobDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobInfoInterface)
  jobs: JobInfoInterface[];
}
