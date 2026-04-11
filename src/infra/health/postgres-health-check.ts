import { performance } from 'node:perf_hooks';
import { sql } from 'drizzle-orm';
import { db } from '@/infra/database/drizzle/connection';
import type { HealthChecker, HealthCheckResult } from './health-check';
import logger from '@/infra/logger';

export class PostgresHealthCheck implements HealthChecker {
  async check(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      await db.execute(sql`SELECT 1 AS ping`);
      return {
        ok: true,
        ms: Math.round(performance.now() - start),
      };
    } catch (error) {
      logger.error('Error checking PostgreSQL health', { error });
      return {
        ok: false,
        ms: Math.round(performance.now() - start),
      };
    }
  }
}
