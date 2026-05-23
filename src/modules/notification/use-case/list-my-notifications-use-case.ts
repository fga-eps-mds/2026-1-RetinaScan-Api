import type { Notificacao, TipoNotificacao } from '../domain';
import type { NotificationsRepository } from '../repositories';

export type ListMyNotificationsUsecaseInput = {
  usuarioId: string;
  status?: 'todas' | 'nao-lidas' | 'lidas';
  tipo?: TipoNotificacao;
  limit?: number;
};

export class ListMyNotificationsUsecase {
  constructor(private readonly notificationRepository: NotificationsRepository) {}

  async execute(input: ListMyNotificationsUsecaseInput): Promise<Notificacao[]> {
    return this.notificationRepository.listarPorUsuario({
      usuarioId: input.usuarioId,
      status: input.status,
      tipo: input.tipo,
      limit: input.limit,
    });
  }
}
