import { FastifyInstance } from 'fastify';
import healthRoute from './health';
import { healthSchema } from '@/api/docs';

export default function registerRoutes(app: FastifyInstance, _options: object, done: () => void) {
  app.get('/health', {
    schema: healthSchema,
    handler: healthRoute,
  });

  done();
}