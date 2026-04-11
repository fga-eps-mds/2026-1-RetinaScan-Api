import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/infra/database/drizzle/migrations',
  schema: './src/infra/database/drizzle/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
