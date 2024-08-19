import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { JobTypeModule } from '../job-type/job-type.module';
import { BatchModule } from '../batch/batch.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    JobTypeModule,
    BatchModule,
    DiscordModule,
  ],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule { }
