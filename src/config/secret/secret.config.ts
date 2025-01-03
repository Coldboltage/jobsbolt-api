import { registerAs } from '@nestjs/config';

export default registerAs('secrets', () => {
  return {
    jwtSecret: process.env.JWT_SECRET,
    openApiKey: process.env.OPENAI_API_KEY,
    discordKey: process.env.DISCORD_KEY,
    sentryDsn: process.env.SENTRY_DSN,
    sendGridApiKey: process.env.SENDGRID_API_KEY,
    rabbitmq: {
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
    },
  };
});
