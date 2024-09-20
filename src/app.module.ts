import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { JobTypeModule } from './job-type/job-type.module';
import { JobModule } from './job/job.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database/database.config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { AuthModule } from './auth/auth.module';
import secretConfig from './config/secret/secret.config';
import { ScheduleModule } from '@nestjs/schedule';
import { BatchModule } from './batch/batch.module';
import { DiscordModule } from './discord/discord.module';
import generalConfig from './config/general/general.config';
import rabbitmqConfig from './config/rabbitmq/rabbitmq.config';
import { validateDatabaseEnv } from './config/database/database.schema';
import { validateGeneralEnv } from './config/general/general.schema';
import { validateSecretEnv } from './config/secret/secret.schema';
import { validateRabbitmqEnv } from './config/rabbitmq/rabbitmq.schema';
import { CoverLetterModule } from './cover-letter/cover-letter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [databaseConfig, secretConfig, generalConfig, rabbitmqConfig],
      isGlobal: true,
      validate: (config) => {
        const databaseVar = validateDatabaseEnv(config);
        const generalVar = validateGeneralEnv(config);
        const secretVar = validateSecretEnv(config);
        const rabbitmqVar = validateRabbitmqEnv(config);
        return { ...databaseVar, ...generalVar, ...secretVar, ...rabbitmqVar };
      },
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
    CoverLetterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
