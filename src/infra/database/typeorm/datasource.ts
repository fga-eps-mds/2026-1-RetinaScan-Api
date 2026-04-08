import { DataSource, type DataSourceOptions } from 'typeorm';
import { env } from '@/env';

function defaultTypeOrmOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    migrationsRun: true,
    entities: [],
    migrations: [],
  };
}

function createDataSource(overrides: Partial<DataSourceOptions>): DataSource {
  return new DataSource({
    ...defaultTypeOrmOptions(),
    ...overrides,
  } as DataSourceOptions);
}

const config = {
  development: (): DataSource =>
    createDataSource({
      synchronize: true,
      ssl: false,
    }),

  production: (): DataSource =>
    createDataSource({
      synchronize: false,
      ssl: false,
    }),

  test: (): DataSource =>
    createDataSource({
      synchronize: true,
      migrations: [],
      ssl: false,
    }),
} as const;

export const dataSource = config[env.NODE_ENV]();
