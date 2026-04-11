import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/infra/database/drizzle/connection';

describe('database integration', () => {
  it('pings PostgreSQL with SELECT 1', async () => {
    const rows = await db.execute(sql`SELECT 1 AS ping`);
    expect(rows.rows[0]?.ping).toBe(1);
  });
});
