import type { ExamShareRepository } from '../exam-share-repository';
import type { UsuariosRepository } from '@/modules/users/repositories';

export type ListMySharesUseCaseInput = {
  compartilhadoPorId: string;
};

export type MyShareDto = {
  id: string;
  examId: string;
  medicoDestino: {
    id: string;
    nomeCompleto: string;
    email: string;
  };
  criadoEm: Date;
  expiraEm: Date | null;
  ativo: boolean;
};

export class ListMySharesUseCase {
  constructor(
    private readonly examShareRepository: ExamShareRepository,
    private readonly usuariosRepository: UsuariosRepository,
  ) {}

  async execute(input: ListMySharesUseCaseInput): Promise<MyShareDto[]> {
    const shares = await this.examShareRepository.listActiveByCompartilhadoPor(
      input.compartilhadoPorId,
    );

    const result = await Promise.all(
      shares.map(async (share) => {
        const medico = await this.usuariosRepository.findBy({ id: share.medicoDestinoId });

        return {
          id: share.id,
          examId: share.examId,
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
