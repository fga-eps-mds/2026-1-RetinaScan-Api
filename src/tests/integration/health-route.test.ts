import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '@/api';

describe('GET /api/health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns database health with flat timing (ms)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      status: string;
      services: { database: { ok: boolean; ms: number } };
    };

    expect(body.status).toBe('healthy');
    expect(body.services.database.ok).toBe(true);
    expect(body.services.database.ms).toBeTypeOf('number');
    expect('responseTime' in body.services.database).toBe(false);
  });
});
