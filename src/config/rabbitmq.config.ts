import { registerAs } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

export default registerAs('rabbitmq', () => {
  return {
    name: 'JOBS_SERVICE',
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${process.env.RABBITMQ_URL}:5672`],
      queue: 'jobs_queue',
      queueOptions: {
        durable: false,
      },
    },
  };
});
