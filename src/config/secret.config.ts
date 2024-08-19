import { registerAs } from '@nestjs/config';

export default registerAs('secrets', () => {
  return {
    jwtSecret: process.env.JWT_SECRET,
    openApiKey: process.env.OPENAI_API_KEY,
    discordKey: process.env.DISCORD_KEY,
  };
});
