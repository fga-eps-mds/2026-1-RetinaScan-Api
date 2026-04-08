import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dataSource } from '@/infra/database/typeorm/datasource';

describe('database integration', () => {
  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('pings PostgreSQL with SELECT 1', async () => {
    const rows = await dataSource.query<Array<{ ping: number }>>('SELECT 1 AS ping');
    expect(rows[0]?.ping).toBe(1);
  });
});
