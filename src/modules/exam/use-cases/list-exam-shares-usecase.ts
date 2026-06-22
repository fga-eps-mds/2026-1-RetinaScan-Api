import type { ExamShareRepository } from '../exam-share-repository';
import type { UsuariosRepository } from '@/modules/users/repositories';
import { NotFoundError } from '@/shared/errors';

export type ListExamSharesUseCaseInput = {
  examId: string;
};

export type ExamShareDto = {
  id: string;
  medicoDestino: {
    id: string;
    nomeCompleto: string;
    email: string;
  };
  criadoEm: Date;
  expiraEm: Date | null;
  ativo: boolean;
};

export class ListExamSharesUseCase {
  constructor(
    private readonly examShareRepository: ExamShareRepository,
    private readonly usuariosRepository: UsuariosRepository,
  ) {}

  async execute(input: ListExamSharesUseCaseInput): Promise<ExamShareDto[]> {
    const shares = await this.examShareRepository.listActiveByExam(input.examId);

    const result = await Promise.all(
      shares.map(async (share) => {
        const medico = await this.usuariosRepository.findBy({ id: share.medicoDestinoId });

        return {
          id: share.id,
          medicoDestino: {
            id: share.medicoDestinoId,
            nomeCompleto: medico?.nomeCompleto ?? 'Desconhecido',
            email: medico?.email ?? 'Desconhecido',
          },
          criadoEm: share.criadoEm,
          expiraEm: share.expiraEm,
          ativo: share.ativo,
        };
      }),
    );

    return result;
  }
}
