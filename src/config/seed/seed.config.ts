import { registerAs } from '@nestjs/config';

export default registerAs('seed', () => {
  return {
    name: process.env.SEEDER_NAME,
    email: process.env.SEEDER_EMAIL,
    password: process.env.SEEDER_PASSWORD,
  };
});
