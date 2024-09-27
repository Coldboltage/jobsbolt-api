import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UserSeeder } from './seeder/seeder.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const userSeeder = app.get(UserSeeder);

  await userSeeder.seed();
  await app.close();
  console.log('Seeding complete');
}
bootstrap();
