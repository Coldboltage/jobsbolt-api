import { registerAs } from '@nestjs/config';

export default registerAs('general', () => {
  return {
    generalTest: process.env.GENERAL_TEST,
    testBatch: process.env.TEST_BATCH,
    testJobFind: process.env.FIND_JOB,
    discordTest: process.env.DISCORD_TEST,
    fullTest: process.env.FULL_TEST,
  };
});
