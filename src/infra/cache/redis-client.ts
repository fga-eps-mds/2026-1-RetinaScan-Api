import Redis from 'ioredis';
import { env } from '@/env';
import logger from '@/infra/logger';

export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redisClient.on('connect', () => {
  logger.info('Redis conectado com sucesso');
});

redisClient.on('error', (error) => {
  logger.error('Erro na conexão com Redis', {
    error: error instanceof Error ? error.message : error,
  });
});
