import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/shared/errors';
import type { NotificationsRepository } from '@/modules/notification/repositories';
import { DeleteNotificationUseCase } from '@/modules/notification/use-case/delete-notification-use-case';

class FakeNotificationsRepository implements NotificationsRepository {
  marcarComoLida = vi.fn();
  marcarEnviadaEmTempoReal = vi.fn();
  marcarEnviadaPorEmail = vi.fn();
  deletar = vi.fn();
  criar = vi.fn();
  buscarPorChave = vi.fn();
  listarPorUsuario = vi.fn();
  marcarTodasComoLidas = vi.fn();
}

describe('DeleteNotificationUseCase', () => {
  let notificationsRepository: FakeNotificationsRepository;
  let usecase: DeleteNotificationUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    notificationsRepository = new FakeNotificationsRepository();
    usecase = new DeleteNotificationUseCase(notificationsRepository);
  });

  it('deve deletar a notificação quando existir', async () => {
    notificationsRepository.deletar.mockResolvedValueOnce(true);

    await expect(
      usecase.execute({
        notificacaoId: 'notif-1',
        usuarioId: 'user-1',
      }),
    ).resolves.toBeUndefined();

    expect(notificationsRepository.deletar).toHaveBeenCalledWith('notif-1', 'user-1');
    expect(notificationsRepository.deletar).toHaveBeenCalledTimes(1);
  });

  it('deve lançar NotFoundError quando a notificação não existir', async () => {
    notificationsRepository.deletar.mockResolvedValueOnce(false);

    await expect(
      usecase.execute({
        notificacaoId: 'notif-inexistente',
        usuarioId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(notificationsRepository.deletar).toHaveBeenCalledWith('notif-inexistente', 'user-1');
    expect(notificationsRepository.deletar).toHaveBeenCalledTimes(1);
  });
});
