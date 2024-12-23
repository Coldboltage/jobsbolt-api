import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
  });
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb' }));

  app.enableCors({
    origin: 'http://localhost:1337', // Only allow requests from this URL
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], // Allowed methods
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
