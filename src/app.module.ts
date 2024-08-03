import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { JobTypeModule } from './job-type/job-type.module';
import { JobModule } from './job/job.module';

@Module({
  imports: [UserModule, JobTypeModule, JobModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
