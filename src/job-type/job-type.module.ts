import { Module } from '@nestjs/common';
import { JobTypeService } from './job-type.service';
import { JobTypeController } from './job-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobType } from './entities/job-type.entity';
import { UserModule } from '../user/user.module';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobType]),
    UserModule,

    ClientsModule.registerAsync([
      {
        name: 'JOBS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          return configService.get('rabbitmq');
        },
      },
    ]),
  ],
  controllers: [JobTypeController],
  providers: [JobTypeService],
  exports: [JobTypeService, UserModule],
})
export class JobTypeModule { }
