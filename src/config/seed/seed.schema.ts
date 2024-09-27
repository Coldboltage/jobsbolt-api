import { z } from 'zod';

const seederEnvSchema = z.object({
  SEEDER_NAME: z.string(),
  SEEDER_EMAIL: z.string(),
  SEEDER_PASSWORD: z.string(),
});

export type SeedConfig = z.infer<typeof seederEnvSchema>;

export const validateSeederEnv = (config: Record<string, unknown>) => {
  const seederValidatedEnv = seederEnvSchema.safeParse(config);
  if (!seederValidatedEnv.success) {
    console.error(
      '❌ Invalid environment variables',
      seederValidatedEnv.error.format(),
    );
    process.exit(1);
  }
  return seederValidatedEnv.data;
};
