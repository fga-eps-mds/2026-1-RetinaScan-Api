import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import type { NotificationsRepository } from '@/modules/notification/repositories';
import type {
  CriarNotificacaoDTO,
  Notificacao,
  TipoNotificacao,
} from '@/modules/notification/domain';
import type { EmailSender } from '@/modules/mail/domain/email-sender';
import type { UsuariosRepository } from '@/modules/users/repositories';
import { NotificationService } from '@/modules/notification/services';
import { Usuario } from '@/modules/users/domain';

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

class FakeUsuariosRepository implements UsuariosRepository {
  findByEmail = vi.fn();
  findByCpf = vi.fn();
  findByCrm = vi.fn();
  getAllUsers = vi.fn();
  create = vi.fn();
  findBy = vi.fn();
  update = vi.fn();
  findMany = vi.fn();
  findAllPaginated = vi.fn();
  updatePassword = vi.fn();
  delete = vi.fn();
}

class FakeEmailSender implements EmailSender {
  send = vi.fn();
}

describe('NotificationService', () => {
  let notificationRepository: FakeNotificationsRepository;
  let usuarioRepository: FakeUsuariosRepository;
  let nodeMailerEmailProvider: FakeEmailSender;

  let fetchSocketsMock: ReturnType<typeof vi.fn>;
  let emitMock: ReturnType<typeof vi.fn>;
  let ioInMock: ReturnType<typeof vi.fn>;
  let ioToMock: ReturnType<typeof vi.fn>;
  let logErrorMock: ReturnType<typeof vi.fn>;

  let app: FastifyInstance;
  let service: NotificationService;

  const makeNotification = (overrides: Partial<Notificacao> = {}): Notificacao => ({
    id: 'notif-1',
    usuarioId: 'user-1',
    tipo: 'avaliacao_ia_atualizada' as TipoNotificacao,
    titulo: 'Avaliação de IA concluída',
    mensagem: 'Os resultados estão disponíveis.',
    dados: null,
    chaveDedupe: 'avaliacao_ia:exam-1',
    lidaEm: null,
    enviadaEmTempoRealEm: null,
    enviadaPorEmailEm: null,
    createdAt: new Date('2026-05-23T01:00:00.000Z'),
    updatedAt: new Date('2026-05-23T01:00:00.000Z'),
    ...overrides,
  });

  const makeInput = (overrides: Partial<CriarNotificacaoDTO> = {}): CriarNotificacaoDTO => ({
    usuarioId: 'user-1',
    tipo: 'avaliacao_ia_atualizada' as TipoNotificacao,
    titulo: 'Avaliação de IA concluída',
    mensagem: 'Os resultados estão disponíveis.',
    dados: null,
    chaveDedupe: 'avaliacao_ia:exam-1',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:3000';

    notificationRepository = new FakeNotificationsRepository();
    usuarioRepository = new FakeUsuariosRepository();
    nodeMailerEmailProvider = new FakeEmailSender();

    fetchSocketsMock = vi.fn();
    emitMock = vi.fn();
    ioInMock = vi.fn(() => ({ fetchSockets: fetchSocketsMock }));
    ioToMock = vi.fn(() => ({ emit: emitMock }));
    logErrorMock = vi.fn();

    app = {
      io: {
        in: ioInMock,
        to: ioToMock,
      },
      log: {
        error: logErrorMock,
      },
    } as unknown as FastifyInstance;

    service = new NotificationService({
      app,
      notificationRepository,
      usuarioRepository,
      nodeMailerEmailProvider,
    });
  });

  it('deve retornar a notificação existente quando a chave dedupe já existir', async () => {
    const existing = makeNotification();

    notificationRepository.buscarPorChave.mockResolvedValueOnce(existing);

    const result = await service.notificar(makeInput());

    expect(notificationRepository.buscarPorChave).toHaveBeenCalledWith('avaliacao_ia:exam-1');
    expect(notificationRepository.criar).not.toHaveBeenCalled();
    expect(ioInMock).not.toHaveBeenCalled();
    expect(nodeMailerEmailProvider.send).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  it('deve criar e enviar por tempo real quando houver sockets conectados', async () => {
    const created = makeNotification();

    notificationRepository.buscarPorChave.mockResolvedValueOnce(null);
    notificationRepository.criar.mockResolvedValueOnce(created);
    fetchSocketsMock.mockResolvedValueOnce([{ id: 'socket-1' }]);
    notificationRepository.marcarEnviadaEmTempoReal.mockResolvedValueOnce(undefined);

    const input = makeInput();
    const result = await service.notificar(input);

    expect(notificationRepository.criar).toHaveBeenCalledWith({
      usuarioId: input.usuarioId,
      tipo: input.tipo,
      titulo: input.titulo,
      mensagem: input.mensagem,
      dados: null,
      chaveDedupe: input.chaveDedupe,
    });

    expect(ioInMock).toHaveBeenCalledWith('user_user-1');
    expect(ioToMock).toHaveBeenCalledWith('user_user-1');
    expect(emitMock).toHaveBeenCalledWith('notification:new', {
      id: created.id,
      tipo: created.tipo,
      titulo: created.titulo,
      mensagem: created.mensagem,
      dados: created.dados,
      lidaEm: created.lidaEm,
      createdAt: created.createdAt,
    });

    expect(notificationRepository.marcarEnviadaEmTempoReal).toHaveBeenCalledWith(created.id);
    expect(usuarioRepository.findBy).not.toHaveBeenCalled();
    expect(nodeMailerEmailProvider.send).not.toHaveBeenCalled();
    expect(notificationRepository.marcarEnviadaPorEmail).not.toHaveBeenCalled();
    expect(result).toBe(created);
  });

  it('deve enviar por email quando não houver sockets conectados', async () => {
    const created = makeNotification();
    const user = {
      id: 'user-1',
      email: 'gustavo@example.com',
    };

    notificationRepository.buscarPorChave.mockResolvedValueOnce(null);
    notificationRepository.criar.mockResolvedValueOnce(created);
    fetchSocketsMock.mockResolvedValueOnce([]);
    usuarioRepository.findBy.mockResolvedValueOnce(user);
    nodeMailerEmailProvider.send.mockResolvedValueOnce(undefined);
    notificationRepository.marcarEnviadaPorEmail.mockResolvedValueOnce(undefined);

    const result = await service.notificar(makeInput());

    expect(ioInMock).toHaveBeenCalledWith('user_user-1');
    expect(usuarioRepository.findBy).toHaveBeenCalledWith({ id: 'user-1' });

    expect(nodeMailerEmailProvider.send).toHaveBeenCalledTimes(1);
    expect(nodeMailerEmailProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'gustavo@example.com',
        subject: 'Nova notificação: Avaliação de IA concluída',
        html: expect.any(String),
        text: expect.any(String),
      }),
    );

    expect(notificationRepository.marcarEnviadaPorEmail).toHaveBeenCalledWith(created.id);
    expect(notificationRepository.marcarEnviadaEmTempoReal).not.toHaveBeenCalled();
    expect(result).toBe(created);
  });

  it('deve lançar erro quando usuário não existir no fluxo de email', async () => {
    const created = makeNotification();

    notificationRepository.buscarPorChave.mockResolvedValueOnce(null);
    notificationRepository.criar.mockResolvedValueOnce(created);
    fetchSocketsMock.mockResolvedValueOnce([]);
    usuarioRepository.findBy.mockResolvedValueOnce(null);

    await expect(service.notificar(makeInput())).rejects.toThrow(
      'Usuário não encontrado para enviar notificação por email',
    );

    expect(nodeMailerEmailProvider.send).not.toHaveBeenCalled();
    expect(notificationRepository.marcarEnviadaPorEmail).not.toHaveBeenCalled();
  });

  it('deve fazer log e retornar a notificação quando o envio de email falhar', async () => {
    const created = makeNotification();
    const user = {
      id: 'user-1',
      email: 'gustavo@example.com',
    };
    const mailError = new Error('smtp down');

    notificationRepository.buscarPorChave.mockResolvedValueOnce(null);
    notificationRepository.criar.mockResolvedValueOnce(created);
    fetchSocketsMock.mockResolvedValueOnce([]);
    usuarioRepository.findBy.mockResolvedValueOnce(user);
    nodeMailerEmailProvider.send.mockRejectedValueOnce(mailError);

    const result = await service.notificar(makeInput());

    expect(nodeMailerEmailProvider.send).toHaveBeenCalledTimes(1);
    expect(notificationRepository.marcarEnviadaPorEmail).not.toHaveBeenCalled();
    expect(logErrorMock).toHaveBeenCalledWith(
      mailError,
      'Erro ao enviar email para usuário user-1 (gustavo@example.com):',
    );
    expect(result).toBe(created);
  });

  it('deve listar notificações por usuário', async () => {
    const notifications = [makeNotification()];

    notificationRepository.listarPorUsuario.mockResolvedValueOnce(notifications);

    const result = await service.listarPorUsuario('user-1');

    expect(notificationRepository.listarPorUsuario).toHaveBeenCalledWith({
      usuarioId: 'user-1',
    });
    expect(result).toEqual(notifications);
  });

  it('deve marcar todas as notificações como lidas', async () => {
    notificationRepository.marcarTodasComoLidas.mockResolvedValueOnce(undefined);

    await expect(service.marcarTodasComoLidas('user-1')).resolves.toBeUndefined();

    expect(notificationRepository.marcarTodasComoLidas).toHaveBeenCalledWith('user-1');
  });
});
