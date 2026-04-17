import { describe, expect, it, vi } from 'vitest';

vi.mock('@/infra/database/drizzle/connection', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({
      rows: [{ ping: 1 }],
    }),
  },
}));

import { sql } from 'drizzle-orm';
import { db } from '@/infra/database/drizzle/connection';

describe('database integration', () => {
  it('pings PostgreSQL with SELECT 1', async () => {
    const rows = await db.execute(sql`SELECT 1 AS ping`);

    expect(rows.rows[0]?.ping).toBe(1);
  });
});
