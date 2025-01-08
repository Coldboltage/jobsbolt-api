import { z } from 'zod';

// Define the Zod schema for environment variables
const generalEnvSchema = z.object({
  GENERAL_TEST: z.enum(['true', 'false']),
  TEST_BATCH: z.enum(['true', 'false']),
  FIND_JOB: z.enum(['true', 'false']),
  DISCORD_TEST: z.enum(['true', 'false']),
  FULL_TEST: z.enum(['true', 'false']),
  API_URL: z.string(),
  RABBITMQ_URL: z.string(),
  WEBSITE_URL: z.string(),
  NODE_ENV: z.string(),
});

export type GeneralConfig = z.infer<typeof generalEnvSchema>;

export const validateGeneralEnv = (config: Record<string, unknown>) => {
  const generalValidatedEnv = generalEnvSchema.safeParse(config);

  if (!generalValidatedEnv.success) {
    console.error(
      '❌ Invalid environment variables',
      generalValidatedEnv.error.format(),
    );
    process.exit(1);
  }

  return generalValidatedEnv.data;
};
