import { NotFoundError } from '@/shared/errors';
import type { NotificationsRepository } from '../repositories';

type Input = {
  notificacaoId: string;
  usuarioId: string;
};

export class DeleteNotificationUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  async execute(input: Input): Promise<void> {
    const deleted = await this.notificationsRepository.deletar(
      input.notificacaoId,
      input.usuarioId,
    );

    if (!deleted) {
      throw new NotFoundError('Notificação não encontrada.');
    }
  }
}
