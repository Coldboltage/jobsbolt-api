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
import { UtilsModule } from './utils/utils.module';
import { SeederModule } from './seeder/seeder.module';
import seedConfig from './config/seed/seed.config';
import { validateSeederEnv } from './config/seed/seed.schema';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { EmailModule } from './email/email.module';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [
        databaseConfig,
        secretConfig,
        generalConfig,
        rabbitmqConfig,
        seedConfig,
      ],
      isGlobal: true,
      validate: (config) => {
        const databaseVar = validateDatabaseEnv(config);
        const generalVar = validateGeneralEnv(config);
        const secretVar = validateSecretEnv(config);
        const rabbitmqVar = validateRabbitmqEnv(config);
        const seederVar = validateSeederEnv(config);
        return {
          ...databaseVar,
          ...generalVar,
          ...secretVar,
          ...rabbitmqVar,
          ...seederVar,
        };
      },
    }),
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const test = configService.get<PostgresConnectionOptions>('database');
        return test;
      },
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const test = {
          transport: {
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false, // Use TLS
            auth: {
              user: 'apikey', // Always 'apikey' for SendGrid
              pass: configService.get('secrets.sendGridApiKey'), // Replace with your actual API Key
            },
          },
          defaults: {
            from: '"Jobsbolt" <admin@jobsbolt.org>', // Default sender
          },
          // template: {
          //   dir: __dirname + '/templates', // Optional: Path to email templates
          //   options: {
          //     strict: true,
          //   },
          // },
        };
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
    UtilsModule,
    SeederModule,
    PrometheusModule.register(),
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule { }
