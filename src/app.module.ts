import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { JobTypeModule } from './job-type/job-type.module';
import { JobModule } from './job/job.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { AuthModule } from './auth/auth.module';
import secretConfig from './config/secret.config';
import { ScheduleModule } from '@nestjs/schedule';
import { BatchModule } from './batch/batch.module';
import { DiscordModule } from './discord/discord.module';
import generalConfig from './config/general.config';
import rabbitmqConfig from './config/rabbitmq.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, secretConfig, generalConfig, rabbitmqConfig],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const test = configService.get<PostgresConnectionOptions>('database');
        return test;
      },
    }),
    UserModule,
    JobTypeModule,
    JobModule,
    AuthModule,
    BatchModule,
    DiscordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
