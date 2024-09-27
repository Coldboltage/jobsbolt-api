import { z } from 'zod';

const databaseEnvSchema = z.object({
  TYPEORM_TYPE: z.string(),
  TYPEORM_HOST: z.string(),
  TYPEORM_PORT: z.string().refine((val) => !isNaN(Number(val)), {
    message: 'PORT must be a number',
  }),
  TYPEORM_USERNAME: z.string(),
  TYPEORM_PASSWORD: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
  TYPEORM_DATABASE: z.string(),
});

export const validateDatabaseEnv = (config: Record<string, unknown>) => {
  const databaseValidatedEnv = databaseEnvSchema.safeParse(config);
  if (!databaseValidatedEnv.success) {
    console.error(
      '❌ Invalid environment variables',
      databaseValidatedEnv.error.format(),
    );
    process.exit(1);
  }
  return databaseValidatedEnv.data;
};
