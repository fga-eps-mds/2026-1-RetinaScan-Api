import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notificacao, TipoNotificacao } from '@/modules/notification/domain';
import type { NotificationsRepository } from '@/modules/notification/repositories';
import { ListMyNotificationsUsecase } from '@/modules/notification/use-case/list-my-notifications-use-case';

class FakeNotificationsRepository implements NotificationsRepository {
  criar = vi.fn();
  buscarPorChave = vi.fn();
  listarPorUsuario = vi.fn();
  marcarComoLida = vi.fn();
  marcarTodasComoLidas = vi.fn();
  deletar = vi.fn();
  marcarEnviadaEmTempoReal = vi.fn();
  marcarEnviadaPorEmail = vi.fn();
}

describe('ListMyNotificationsUsecase', () => {
  let notificationsRepository: FakeNotificationsRepository;
  let usecase: ListMyNotificationsUsecase;

  const notificationMock = (overrides: Partial<Notificacao> = {}): Notificacao => ({
    id: 'notif-1',
    usuarioId: 'user-1',
    tipo: 'avaliacao_ia_atualizada' as TipoNotificacao,
    titulo: 'Avaliação concluída',
    mensagem: 'Seu exame já possui resultado.',
    dados: null,
    chaveDedupe: 'avaliacao_ia:exam-1',
    lidaEm: null,
    enviadaEmTempoRealEm: null,
    enviadaPorEmailEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    notificationsRepository = new FakeNotificationsRepository();
    usecase = new ListMyNotificationsUsecase(notificationsRepository);
  });

  it('deve listar notificações repassando todos os filtros para o repositório', async () => {
    const notifications = [
      notificationMock(),
      notificationMock({
        id: 'notif-2',
        tipo: 'solicitacao_cpf_crm_aprovada' as TipoNotificacao,
      }),
    ];

    notificationsRepository.listarPorUsuario.mockResolvedValueOnce(notifications);

    const result = await usecase.execute({
      usuarioId: 'user-1',
      status: 'nao-lidas',
      tipo: 'avaliacao_ia_atualizada' as TipoNotificacao,
      limit: 10,
    });

    expect(notificationsRepository.listarPorUsuario).toHaveBeenCalledTimes(1);
    expect(notificationsRepository.listarPorUsuario).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      status: 'nao-lidas',
      tipo: 'avaliacao_ia_atualizada',
      limit: 10,
    });
    expect(result).toEqual(notifications);
  });

  it('deve listar notificações com apenas o usuarioId quando filtros opcionais não forem enviados', async () => {
    const notifications = [notificationMock()];
    notificationsRepository.listarPorUsuario.mockResolvedValueOnce(notifications);

    const result = await usecase.execute({
      usuarioId: 'user-1',
    });

    expect(notificationsRepository.listarPorUsuario).toHaveBeenCalledTimes(1);
    expect(notificationsRepository.listarPorUsuario).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      status: undefined,
      tipo: undefined,
      limit: undefined,
    });
    expect(result).toEqual(notifications);
  });

  it('deve retornar array vazio quando o repositório não encontrar notificações', async () => {
    notificationsRepository.listarPorUsuario.mockResolvedValueOnce([]);

    const result = await usecase.execute({
      usuarioId: 'user-1',
      status: 'lidas',
    });

    expect(notificationsRepository.listarPorUsuario).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      status: 'lidas',
      tipo: undefined,
      limit: undefined,
    });
    expect(result).toEqual([]);
  });
});
