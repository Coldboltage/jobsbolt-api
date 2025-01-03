import { z } from 'zod';

const secretEnvSchema = z.object({
  JWT_SECRET: z.string(),
  OPENAI_API_KEY: z.string(),
  DISCORD_KEY: z.string(),
  RABBITMQ_USERNAME: z.string(),
  RABBITMQ_PASSWORD: z.string(),
  SENTRY_DSN: z.string(),
  SENDGRID_API_KEY: z.string()
});

export const validateSecretEnv = (config: Record<string, unknown>) => {
  const secretValidatedEnv = secretEnvSchema.safeParse(config);

  if (!secretValidatedEnv.success) {
    console.error(
      '❌ Invalid environment variables',
      secretValidatedEnv.error.format(),
    );
    process.exit(1);
  }

  return secretValidatedEnv.data;
};
