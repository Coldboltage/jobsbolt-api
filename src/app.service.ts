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
    // await this.jobService.resetFalse('373b0fd3-f744-489d-94a4-e4be66384d05')
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
  }
}
