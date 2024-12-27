import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import './instrument';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
  });
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb' }));

  const configService = app.get(ConfigService);
  const websiteUrl = configService.get('general.websiteUrl')

  app.enableCors({
    // origin: `http://${websiteUrl}:1337`, // Only allow requests from this URL
    origin: (origin, callback) => {
      // Allow localhost and ngrok URLs
      if (!origin || origin.includes(websiteUrl)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow JWTs, etc.
    credentials: true, // Required to allow cookies and credentials

  });

  console.log('cors being used')

  const config = new DocumentBuilder()
    .setTitle('Jobsbolt API')
    .setDescription('The Jobs API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
