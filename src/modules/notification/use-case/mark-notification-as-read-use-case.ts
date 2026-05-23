import { NotFoundError } from '@/shared/errors';
import type { NotificationsRepository } from '../repositories';

type Input = {
  notificacaoId: string;
  usuarioId: string;
};

export class MarkNotificationAsReadUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  async execute(input: Input): Promise<void> {
    const updated = await this.notificationsRepository.marcarComoLida({
      notificacaoId: input.notificacaoId,
      usuarioId: input.usuarioId,
    });

    if (!updated) {
      throw new NotFoundError('Notificação não encontrada.');
    }
  }
}
