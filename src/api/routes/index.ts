import type { FastifyPluginAsync } from 'fastify';
import healthHandler from './health';
import { authRoutes } from './auth';
import { usuarioRoutes } from './usuarios';
import { examRoutes } from './exams';
import notificationRoutes from './notifications';
import { logsRoute } from './logs';

const registerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', healthHandler);

  await app.register(authRoutes);
  await app.register(examRoutes);
  await app.register(usuarioRoutes);
  await app.register(notificationRoutes);
  await app.register(logsRoute);
};

export default registerRoutes;
