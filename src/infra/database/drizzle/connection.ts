import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '@/env';
import logger from '@/infra/logger';
import path from 'node:path';
import * as schema from './schema/index';

const migrationsFolder = path.resolve(__dirname, 'migrations');

const config = {
  development: { migrationsRun: true, ssl: false },
  production: { migrationsRun: true, ssl: false },
  test: { migrationsRun: true, ssl: false },
} as const;

const options = config[env.NODE_ENV];

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: options.ssl,
});

export const db = drizzle(pool, { schema });

export async function connectDatabase(): Promise<void> {
  logger.info('Starting PostgreSQL database');
  try {
    await pool.query('SELECT 1');

    await migrate(db, { migrationsFolder });
    logger.info('Database migrations applied');

    logger.info('PostgreSQL database connected successfully');
  } catch (error) {
    logger.error('Error starting PostgreSQL database', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await pool.end();
}
