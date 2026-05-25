import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { NotFoundError, ValidationError } from '@/shared/errors';

const resolveMock = vi.fn();
const executeMock = vi.fn();

vi.mock('@/infra/container', () => ({
  container: {
    resolve: resolveMock,
  },
}));

describe('markNotificationAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveMock.mockReturnValue({
      execute: executeMock,
    });
  });

  it('should resolve use case, execute it with request.user.id and return 204', async () => {
    const { markNotificationAsRead } =
      await import('@/api/routes/notification/mark-notification-as-read.js');

    const statusMock = vi.fn().mockReturnThis();
    const sendMock = vi.fn().mockReturnThis();

    const request = {
      params: {
        id: '550e8400-e29b-41d4-a716-446655440000',
      },
      user: {
        id: 'user-1',
      },
    } as unknown as FastifyRequest<{ Params: { id: string } }>;

    const reply = {
      status: statusMock,
      send: sendMock,
    } as unknown as FastifyReply;

    executeMock.mockResolvedValueOnce(undefined);

    await markNotificationAsRead(request, reply);

    expect(resolveMock).toHaveBeenCalledWith('markNotificationAsReadUseCase');
    expect(executeMock).toHaveBeenCalledWith({
      notificacaoId: '550e8400-e29b-41d4-a716-446655440000',
      usuarioId: 'user-1',
    });
    expect(statusMock).toHaveBeenCalledWith(204);
    expect(sendMock).toHaveBeenCalled();
  });

  it('should throw ValidationError when id is invalid', async () => {
    const { markNotificationAsRead } =
      await import('@/api/routes/notification/mark-notification-as-read.js');

    const request = {
      params: {
        id: 'not-a-uuid',
      },
      user: {
        id: 'user-1',
      },
    } as unknown as FastifyRequest<{ Params: { id: string } }>;

    const reply = {} as FastifyReply;

    await expect(markNotificationAsRead(request, reply)).rejects.toBeInstanceOf(ValidationError);

    expect(resolveMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('should propagate use case error', async () => {
    const { markNotificationAsRead } =
      await import('@/api/routes/notification/mark-notification-as-read.js');

    const request = {
      params: {
        id: '550e8400-e29b-41d4-a716-446655440000',
      },
      user: {
        id: 'user-1',
      },
    } as unknown as FastifyRequest<{ Params: { id: string } }>;

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    executeMock.mockRejectedValueOnce(new NotFoundError('Notificação não encontrada.'));

    await expect(markNotificationAsRead(request, reply)).rejects.toThrow(
      'Notificação não encontrada.',
    );

    expect(resolveMock).toHaveBeenCalledWith('markNotificationAsReadUseCase');
    expect(executeMock).toHaveBeenCalledWith({
      notificacaoId: '550e8400-e29b-41d4-a716-446655440000',
      usuarioId: 'user-1',
    });
  });
});
