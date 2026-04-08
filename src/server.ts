import logger from '@/infra/logger';
import { buildApp } from '@/api';
import { env } from '@/env';
import { dataSource } from '@/infra/database/typeorm/datasource';

export async function startDatabase(): Promise<void> {
  logger.info('Starting PostgreSQL database');
  try {
    await dataSource.initialize();
    logger.info('PostgreSQL database connected successfully');
  } catch (error) {
    logger.error('Error starting PostgreSQL database', { error });
    throw error;
  }
}

export async function server(): Promise<void> {
  logger.info('Setting up server');
  
  await startDatabase();
  const app = await buildApp();

  await app.listen({
    port: env.PORT,
    host: '0.0.0.0',
  });

  logger.info('🍺 Server is already up');
}

server().catch(error => 
  logger.error('Error starting server', error),
);