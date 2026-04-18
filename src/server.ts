import logger from '@/infra/logger';
import { buildApp } from '@/api';
import { env } from '@/env';
import { connectDatabase } from '@/infra/database/drizzle/connection';
import { setupMinio } from '@/infra/storage/setup-minio';
import { ensureAdminUserExists } from './modules/users/use-cases/ensure-admin-exists';

export async function server(): Promise<void> {
  logger.info('Setting up server');

  await connectDatabase();

  logger.info('Configurando buckets do MinIO');
  await setupMinio();
  logger.info('Buckets do MinIO prontos');

  const app = await buildApp();

  logger.info('Executando seed do admin');
  await ensureAdminUserExists();
  logger.info('Seed do admin concluído');

  await app.listen({
    port: env.PORT,
    host: '0.0.0.0',
  });

  logger.info('🍺 Server is already up');
}

server().catch((error: unknown) => logger.error('Error starting server', { error }));
