import { IsArray, IsUUID } from 'class-validator';

export class ResetCvsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  cvIds: string[];
}
