import type { FastifyInstance } from 'fastify';
import type { NotificationsRepository } from '../repositories';
import type { CriarNotificacaoDTO, Notificacao } from '../domain';
import type { EmailSender } from '@/modules/mail/domain/email-sender';
import type { UsuariosRepository } from '@/modules/users/repositories';
import { notificationEmailTemplate } from '@/infra/mail/templates/notification-email-template';

interface NotificationServiceDependencies {
  app: FastifyInstance;
  notificationRepository: NotificationsRepository;
  usuarioRepository: UsuariosRepository;
  nodeMailerEmailProvider: EmailSender;
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

    const usuario = await this.dependencies.usuarioRepository.findBy({ id: dados.usuarioId });

    if (!usuario) {
      throw new Error('Usuário não encontrado para enviar notificação por email');
    }

    try {
      const template = notificationEmailTemplate({
        title: dados.titulo,
        description: dados.mensagem,
        categoryLabel: 'Notificação do Sistema',
        actionLabel: 'Ver Notificação',
        actionUrl: `${process.env.FRONTEND_URL}/notifications`,
        timeLabel: new Date(notificacao.createdAt).toLocaleString('pt-BR', {
          dateStyle: 'long',
          timeStyle: 'short',
        }),
      });

      await this.dependencies.nodeMailerEmailProvider.send({
        to: usuario.email,
        subject: `Nova notificação: ${dados.titulo}`,
        html: template.html,
        text: template.text,
      });
      await this.dependencies.notificationRepository.marcarEnviadaPorEmail(notificacao.id);
    } catch (error) {
      this.dependencies.app.log.error(
        error,
        `Erro ao enviar email para usuário ${usuario.id} (${usuario.email}):`,
      );
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
