import logger from '@/infra/logger';
import { buildApp } from '@/api';
import { env } from '@/env';
import { connectDatabase } from '@/infra/database/drizzle/connection';
import { container } from '@/infra/container';

async function ensureAdminExists(): Promise<void> {
  logger.info('Ensuring admin user exists', { email: env.ADMIN_EMAIL });
  try {
    const useCase = container.resolve('ensureAdminExistsUseCase');

    await useCase.execute({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      birthDate: new Date(env.ADMIN_BIRTH_DATE),
      crm: env.ADMIN_CRM,
      cpf: env.ADMIN_CPF,
      identityNumber: env.ADMIN_IDENTITY_NUMBER,
    });

    logger.info('Admin user ensured', { email: env.ADMIN_EMAIL });
  } catch (error) {
    logger.error('Error ensuring admin user', { error });
    throw error;
  }
}

export async function server(): Promise<void> {
  logger.info('Setting up server');

  await connectDatabase();
  const app = await buildApp();

  await ensureAdminExists();

  await app.listen({
    port: env.PORT,
    host: '0.0.0.0',
  });

  logger.info('🍺 Server is already up');
}

server().catch((error: unknown) => logger.error('Error starting server', { error }));
