import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '@/shared/errors';

const resolveMock = vi.fn();
const executeMock = vi.fn();

vi.mock('@/infra/container', () => ({
  container: {
    resolve: resolveMock,
  },
}));

describe('DELETE /api/notifications/:id', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    app = Fastify();

    app.decorateRequest('user', undefined);

    app.addHook('onRequest', async (request) => {
      request.user = { id: 'user-1' } as any;
    });

    app.setErrorHandler((error: any, _request, reply) => {
      if (error instanceof NotFoundError || error.name === 'NotFoundError') {
        return reply.status(404).send({ message: error.message });
      }

      if (error instanceof ValidationError || error.name === 'ValidationError') {
        return reply.status(400).send({
          message: error.message,
          issues: (error as any).issues ?? (error as any).details ?? [],
        });
      }

      return reply.status(500).send({
        message: error instanceof Error ? error.message : 'Internal Server Error',
      });
    });

    resolveMock.mockReturnValue({
      execute: executeMock,
    });

    const { deleteNotification } = await import('@/api/routes/notification/delete-notification.js');

    app.delete('/api/notifications/:id', deleteNotification);

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 204 when notification is deleted successfully', async () => {
    executeMock.mockResolvedValueOnce(undefined);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/notifications/550e8400-e29b-41d4-a716-446655440000',
    });

    expect(res.statusCode).toBe(204);
    expect(resolveMock).toHaveBeenCalledWith('deleteNotificationUseCase');
    expect(executeMock).toHaveBeenCalledWith({
      notificacaoId: '550e8400-e29b-41d4-a716-446655440000',
      usuarioId: 'user-1',
    });
  });

  it('returns 400 when id is invalid', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/notifications/not-a-uuid',
    });

    expect(res.statusCode).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('returns 404 when notification does not exist', async () => {
    executeMock.mockRejectedValueOnce(new NotFoundError('Notificação não encontrada.'));

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/notifications/550e8400-e29b-41d4-a716-446655440000',
    });

    expect(res.statusCode).toBe(404);
    expect(resolveMock).toHaveBeenCalledWith('deleteNotificationUseCase');
    expect(executeMock).toHaveBeenCalledWith({
      notificacaoId: '550e8400-e29b-41d4-a716-446655440000',
      usuarioId: 'user-1',
    });
  });

  it('uses request.user.id when calling the use case', async () => {
    executeMock.mockResolvedValueOnce(undefined);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/notifications/550e8400-e29b-41d4-a716-446655440000',
    });

    expect(res.statusCode).toBe(204);
    expect(executeMock).toHaveBeenCalledTimes(1);

    const [payload] = executeMock.mock.calls[0];
    expect(payload.usuarioId).toBe('user-1');
    expect(payload.notificacaoId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
