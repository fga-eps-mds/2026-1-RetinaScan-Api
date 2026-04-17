import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('@/infra/health', () => ({
  PostgresHealthCheck: vi.fn(
    class {
      check = vi.fn().mockResolvedValue({
        ok: true,
        ms: 5,
      });
    },
  ),
}));

vi.mock('@/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    ALLOWED_ORIGINS: 'http://localhost:5173',
    BETTER_AUTH_SECRET: 'test',
    BETTER_AUTH_URL: 'http://localhost:3000',
  },
}));

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const mod = await import('../../api/index.js');
    app = await mod.buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns health', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    console.log(res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
  });
});
