import { PartialType } from '@nestjs/swagger';
import { CreateCoverLetterDto } from './create-cover-letter.dto';

export class UpdateCoverLetterDto extends PartialType(CreateCoverLetterDto) {}
