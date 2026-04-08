import { PostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalSetup() {

  const container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('retina-scan-test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  return async () => {
    await container.stop();
  };
}
