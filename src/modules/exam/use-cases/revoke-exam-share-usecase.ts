import type { ExamShareRepository } from '../exam-share-repository';
import type { ExamesRepository } from '../exam-repository';
import type { UsuariosRepository } from '@/modules/users/repositories';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';

export type RevokeExamShareUseCaseInput = {
  shareId: string;
  requesterId: string;
};

export class RevokeExamShareUseCase {
  constructor(
    private readonly examShareRepository: ExamShareRepository,
    private readonly examRepository: ExamesRepository,
    private readonly usuariosRepository: UsuariosRepository,
  ) {}

  async execute(input: RevokeExamShareUseCaseInput): Promise<void> {
    const share = await this.examShareRepository.findById(input.shareId);
    if (!share) {
      throw new NotFoundError('Compartilhamento não encontrado.');
    }

    if (!share.ativo) {
      throw new ConflictError('Este acesso já foi revogado anteriormente.');
    }

    const requester = await this.usuariosRepository.findBy({ id: input.requesterId });
    if (!requester) {
      throw new NotFoundError('Usuário não encontrado.');
    }

    const exam = await this.examRepository.findOne({ examId: share.examId });
    if (!exam) {
      throw new NotFoundError('Exame não encontrado.');
    }

    // Apenas o criador do exame ou um ESPECIALISTA/ADMIN pode revogar
    if (
      exam.idUsuario !== requester.id &&
      requester.tipoPerfil !== 'ESPECIALISTA' &&
      requester.tipoPerfil !== 'ADMIN'
    ) {
      throw new UnauthorizedError('Você não tem permissão para revogar este compartilhamento.');
    }

    await this.examShareRepository.revoke(input.shareId);
  }
}
