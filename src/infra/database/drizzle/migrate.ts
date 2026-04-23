import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '@/env';

async function run() {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  const db = drizzle(pool);

  await migrate(db, {
    migrationsFolder: './dist/infra/database/drizzle/migrations',
  });

  await pool.end();
}

run().catch((error) => {
  console.error('Migration failed', error);
  process.exit(1);
});
