import type { FastifyPluginAsync } from 'fastify';
import healthHandler from './health';
import { authRoutes } from './auth';
import { usuarioRoutes } from './usuarios';

const registerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', healthHandler);

  await app.register(authRoutes);
  await app.register(usuarioRoutes);
};

export default registerRoutes;
