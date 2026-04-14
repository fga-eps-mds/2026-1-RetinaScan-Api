import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { type FastifyInstance, fastify } from 'fastify';
import { env } from '@/env';
import { errorHandler } from './middlewares/error-handler';
import routes from './routes';

export async function buildApp(): Promise<FastifyInstance> {
  const loggerConfig = (() => {
    const nodeEnv = process.env.NODE_ENV ?? env.NODE_ENV;

    if (nodeEnv === 'development') {
      return {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
          },
        },
      };
    }

    return true;
  })();

  const app = fastify({
    logger: loggerConfig,
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

  await app.register(cors, {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  await app.register(routes, { prefix: '/api' });

  app.setErrorHandler(errorHandler);

  return app;
}
