import type { FastifyInstance } from 'fastify';
import type { NotificationsRepository } from '../repositories';
import type { CriarNotificacaoDTO, Notificacao } from '../domain';

interface NotificationServiceDependencies {
  app: FastifyInstance;
  notificationRepository: NotificationsRepository;
}

export class NotificationService {
  constructor(private readonly dependencies: NotificationServiceDependencies) {}

  async notificar(dados: CriarNotificacaoDTO): Promise<Notificacao> {
    const notificacaoExistente = await this.dependencies.notificationRepository.buscarPorChave(
      dados.chaveDedupe,
    );

    if (notificacaoExistente) {
      return notificacaoExistente;
    }

    const notificacao = await this.dependencies.notificationRepository.criar({
      usuarioId: dados.usuarioId,
      tipo: dados.tipo,
      titulo: dados.titulo,
      mensagem: dados.mensagem,
      dados: dados.dados ?? null,
      chaveDedupe: dados.chaveDedupe,
    });

    const room = `user_${dados.usuarioId}`;
    const connectedSockets = await this.dependencies.app.io.in(room).fetchSockets();

    this.dependencies.app.log.info(
      {
        room,
        sockets: connectedSockets.map((socket) => ({
          id: socket.id,
          rooms: [...socket.rooms],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          userId: socket.data.userId,
        })),
      },
      'notification debug',
    );

    if (connectedSockets.length > 0) {
      this.dependencies.app.io.to(room).emit('notification:new', {
        id: notificacao.id,
        tipo: notificacao.tipo,
        titulo: notificacao.titulo,
        mensagem: notificacao.mensagem,
        dados: notificacao.dados,
        lidaEm: notificacao.lidaEm,
        createdAt: notificacao.createdAt,
      });

      await this.dependencies.notificationRepository.marcarEnviadaEmTempoReal(notificacao.id);

      return notificacao;
    }

    return notificacao;
  }

  async listarPorUsuario(usuarioId: string): Promise<Notificacao[]> {
    return this.dependencies.notificationRepository.listarPorUsuario({ usuarioId });
  }

  async marcarTodasComoLidas(usuarioId: string): Promise<void> {
    return this.dependencies.notificationRepository.marcarTodasComoLidas(usuarioId);
  }
}
