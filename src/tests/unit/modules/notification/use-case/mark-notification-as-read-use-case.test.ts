import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/shared/errors';
import type { NotificationsRepository } from '@/modules/notification/repositories';
import { MarkNotificationAsReadUseCase } from '@/modules/notification/use-case/mark-notification-as-read-use-case';

class FakeNotificationsRepository implements NotificationsRepository {
  criar = vi.fn();
  buscarPorChave = vi.fn();
  listarPorUsuario = vi.fn();
  marcarComoLida = vi.fn();
  marcarTodasComoLidas = vi.fn();
  marcarEnviadaEmTempoReal = vi.fn();
  marcarEnviadaPorEmail = vi.fn();
  deletar = vi.fn();
}

describe('MarkNotificationAsReadUseCase', () => {
  let notificationsRepository: FakeNotificationsRepository;
  let usecase: MarkNotificationAsReadUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationsRepository = new FakeNotificationsRepository();
    usecase = new MarkNotificationAsReadUseCase(notificationsRepository);
  });

  it('deve marcar a notificação como lida', async () => {
    notificationsRepository.marcarComoLida.mockResolvedValueOnce(true);

    await expect(
      usecase.execute({
        notificacaoId: 'notif-1',
        usuarioId: 'user-1',
      }),
    ).resolves.toBeUndefined();

    expect(notificationsRepository.marcarComoLida).toHaveBeenCalledTimes(1);
    expect(notificationsRepository.marcarComoLida).toHaveBeenCalledWith({
      notificacaoId: 'notif-1',
      usuarioId: 'user-1',
    });
  });

  it('deve lançar NotFoundError quando a notificação não existir', async () => {
    notificationsRepository.marcarComoLida.mockResolvedValueOnce(false);

    await expect(
      usecase.execute({
        notificacaoId: 'notif-inexistente',
        usuarioId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(notificationsRepository.marcarComoLida).toHaveBeenCalledTimes(1);
    expect(notificationsRepository.marcarComoLida).toHaveBeenCalledWith({
      notificacaoId: 'notif-inexistente',
      usuarioId: 'user-1',
    });
  });
});
