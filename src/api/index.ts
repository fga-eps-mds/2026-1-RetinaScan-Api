import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { fastify } from 'fastify';
import { env } from '@/env';
import { errorHandler } from './middlewares/error-handler';
import routes from './routes';

const loggerEnv = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
      },
    },
  },
  production: true,
  test: false,
}

export async function buildApp() {
  const app = fastify({
    logger: loggerEnv[env.NODE_ENV] ?? true,
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'RetinaScan API',
        description: 'Documentação gerada a partir dos schemas das rotas Fastify.',
        version: '1.0.0',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(cors, { origin: '*' });
  await app.register(routes, { prefix: '/retina-scan' });

  app.setErrorHandler(errorHandler);

  return app;
}