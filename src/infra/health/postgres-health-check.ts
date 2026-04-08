import { performance } from 'node:perf_hooks';
import { dataSource } from '@/infra/database/typeorm/datasource';
import type { HealthChecker, HealthCheckResult } from './health-check';
import logger from '@/infra/logger';

export class PostgresHealthCheck implements HealthChecker {
  async check(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      await dataSource.query('SELECT 1 AS ping');
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
