import { Module } from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CoverLetterController } from './cover-letter.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoverLetter } from './entities/cover-letter.entity';
import { JobModule } from '../job/job.module';
import { UtilsModule } from '../utils/utils.module';
import { BatchModule } from '../batch/batch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoverLetter]),
    JobModule,
    UtilsModule,
    BatchModule,
  ],
  controllers: [CoverLetterController],
  providers: [CoverLetterService],
})
export class CoverLetterModule { }
