import { z } from 'zod';

const rabbitmqSchemaEnv = z.object({
  RABBITMQ_URL: z.string(),
});

export const validateRabbitmqEnv = (config: Record<string, unknown>) => {
  const rabbitmqValidatedEnv = rabbitmqSchemaEnv.safeParse(config);

  if (!rabbitmqValidatedEnv.success) {
    console.error(
      '❌ Invalid environment variables',
      rabbitmqValidatedEnv.error.format(),
    );
    process.exit(1);
  }

  return rabbitmqValidatedEnv.data;
};
