import type { FastifyPluginAsync } from 'fastify';
import healthHandler from './health';
import { healthSchema } from '../docs';
import { authRoutes } from './auth';
import { usuarioRoutes } from './usuarios';
import { examRoutes } from './exams';
import notificationRoutes from './notifications';

const registerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', { schema: healthSchema }, healthHandler);

  await app.register(authRoutes);
  await app.register(examRoutes);
  await app.register(usuarioRoutes);
  await app.register(notificationRoutes);
};

export default registerRoutes;
