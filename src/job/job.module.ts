import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { JobTypeModule } from '../job-type/job-type.module';
import { BatchModule } from '../batch/batch.module';
import { DiscordModule } from '../discord/discord.module';
import { AuthModule } from '../auth/auth.module';
import { UtilsModule } from '../utils/utils.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    AuthModule,
    JobTypeModule,
    BatchModule,
    DiscordModule,
    UtilsModule,
  ],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService],
})
export class JobModule { }
