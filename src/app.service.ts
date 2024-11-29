import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobTypeService } from './job-type/job-type.service';
import { JobService } from './job/job.service';
import { Cron } from '@nestjs/schedule';
import { UtilsService } from './utils/utils.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    private configService: ConfigService,
    private jobTypeService: JobTypeService,
    private jobService: JobService,
    private utilService: UtilsService,
  ) { }

  async onApplicationBootstrap() {
    const fullStartTest = this.configService.get<string>('general.fullTest');
    if (fullStartTest == 'true') await this.fullRun();
  }

  getHello(): string {
    return 'Hello World!';
  }

  @Cron('0 */12 * * *')
  async fullRun() {
    await this.jobTypeService.checkNewJobs();
    const checkInterval = setInterval(async () => {
      const result = await this.utilService.checkStatus();
      if (result) {
        clearInterval(checkInterval); // Stop the polling
        await this.jobService.createBatchJob(); // Run the batch job
      }
    }, 10000); // Check every 10 seconds
    console.log('fullRun completed');
  }
}
