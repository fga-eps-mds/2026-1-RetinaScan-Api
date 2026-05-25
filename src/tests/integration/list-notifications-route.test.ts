import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

import { ValidationError } from '@/shared/errors';

const resolveMock = vi.fn();
const executeMock = vi.fn();

vi.mock('@/infra/container', () => ({
  container: {
    resolve: resolveMock,
  },
}));

describe('GET /api/notifications', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    app = Fastify();

    app.decorateRequest('user', undefined);

    app.addHook('preHandler', async (request) => {
      request.user = { id: 'user-1' } as never;
    });

    app.setErrorHandler((error: any, _request, reply) => {
      if (error instanceof ValidationError || error.name === 'ValidationError') {
        return reply.status(400).send({
          message: error.message,
          issues: (error as any).issues ?? (error as any).details ?? [],
        });
      }

      return reply.status(500).send({
        message: 'Internal Server Error',
      });
    });

    resolveMock.mockReturnValue({
      execute: executeMock,
    });

    const { listNotifications } = await import('@/api/routes/notification/list-notifications.js');

    app.register(
      async (api) => {
        api.get('/notifications', listNotifications);
      },
      { prefix: '/api' },
    );

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with notifications using explicit query params', async () => {
    const notifications = [
      {
        id: 'notif-1',
        usuarioId: 'user-1',
        tipo: 'avaliacao_ia_atualizada',
        titulo: 'Avaliação concluída',
        mensagem: 'Seu exame foi processado.',
        dados: null,
        chaveDedupe: 'dedupe-1',
        lidaEm: null,
        enviadaEmTempoRealEm: null,
        enviadaPorEmailEm: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    executeMock.mockResolvedValueOnce(notifications);

    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?status=nao-lidas&tipo=avaliacao_ia_atualizada&limit=10',
    });

    expect(res.statusCode).toBe(200);
    expect(resolveMock).toHaveBeenCalledWith('listMyNotificationsUsecase');
    expect(executeMock).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      status: 'nao-lidas',
      tipo: 'avaliacao_ia_atualizada',
      limit: 10,
    });
    expect(res.json()).toEqual(notifications);
  });

  it('returns 200 with default query values when query params are omitted', async () => {
    executeMock.mockResolvedValueOnce([]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications',
    });

    expect(res.statusCode).toBe(200);
    expect(resolveMock).toHaveBeenCalledWith('listMyNotificationsUsecase');
    expect(executeMock).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      status: 'todas',
      tipo: undefined,
      limit: 20,
    });
    expect(res.json()).toEqual([]);
  });

  it('returns 400 when status is invalid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?status=invalido',
    });

    expect(res.statusCode).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when tipo is empty after trim', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?tipo=%20%20%20',
    });

    expect(res.statusCode).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when limit is less than 1', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?limit=0',
    });

    expect(res.statusCode).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when limit is greater than 100', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?limit=101',
    });

    expect(res.statusCode).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when limit is not an integer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?limit=1.5',
    });

    expect(res.statusCode).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when unknown query param is provided', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?foo=bar',
    });

    expect(res.statusCode).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });
});
