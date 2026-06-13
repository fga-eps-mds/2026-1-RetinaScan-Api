import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { spyOnAuthApi } from '@/tests/helpers/auth-spies';

vi.mock('@/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    ALLOWED_ORIGINS: 'http://localhost:5173',
    BETTER_AUTH_SECRET: 'test',
    BETTER_AUTH_URL: 'http://localhost:3000',
  },
}));

describe('POST /api/usuarios/enviar-convite-inscricao (integration)', () => {
  let app: FastifyInstance;
  const authSpies = spyOnAuthApi();

  beforeAll(async () => {
    // mock the usecase class so container registers a mocked implementation
    vi.mock('@/modules/users/use-cases/enviar-convite-inscricao', () => ({
      EnviarConviteInscricaoUsecase: class {
        execute = vi.fn().mockResolvedValue(undefined);
      },
    }));

    const mod = await import('../../api/index.js');
    app = await mod.buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    authSpies.resetAll();
  });

  it('returns 201 for admin sending invite', async () => {
    const admin = { id: 'admin-1', email: 'admin@test.com', nomeCompleto: 'Admin', tipoPerfil: 'ADMIN' };
    authSpies.authenticateAs(admin as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/usuarios/enviar-convite-inscricao',
      payload: { email: 'doc@test.com' },
    });

    expect(res.statusCode).toBe(201);
  });

  it('returns 400 when body invalid', async () => {
    const admin = { id: 'admin-1', email: 'admin@test.com', nomeCompleto: 'Admin', tipoPerfil: 'ADMIN' };
    authSpies.authenticateAs(admin as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/usuarios/enviar-convite-inscricao',
      payload: { email: 'invalid' },
    });

    expect(res.statusCode).toBe(400);
  });
});
