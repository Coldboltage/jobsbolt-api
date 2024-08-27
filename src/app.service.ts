import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobTypeService } from './job-type/job-type.service';
import { JobService } from './job/job.service';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    private configService: ConfigService,
    private jobTypeService: JobTypeService,
    private jobService: JobService,
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
      const result = await this.checkStatus();
      if (result) {
        clearInterval(checkInterval); // Stop the polling
        await this.jobService.createBatchJob(); // Run the batch job
      }
    }, 10000); // Check every 10 seconds
  }

  async checkStatus(): Promise<boolean> {
    const rabbitMqUrl = `http://localhost:15672`;
    const username = this.configService.get<string>(
      'secrets.rabbitmq.username',
    );
    const password = this.configService.get<string>(
      'secrets.rabbitmq.password',
    );
    console.log(username);
    const url = `${rabbitMqUrl}/api/queues/%2F/jobs_queue`;

    try {
      const response = await axios.get(url, {
        auth: {
          username,
          password,
        },
      });

      const queueInfo = response.data;
      console.log(queueInfo.messages);
      if (queueInfo.messages === 0) {
        console.log('No more messages');
      } else {
        console.log('Still a message being processed');
      }

      return queueInfo.messages === 0; /// this will be true
    } catch (error) {
      console.error('Failed to query RabbitMQ API', error);
      return false; // Handle the error appropriately
    }
  }
}
