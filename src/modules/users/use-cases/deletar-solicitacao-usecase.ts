import type { SolicitacaoCpfCrmRepository } from '@/modules/users/repositories';
import { ValidationError } from '@/shared/errors';

export type DeletarSolicitacaoCpfCrmUsecaseInput = {
  idSolicitacao: string;
};

export class DeletarSolicitacaoCpfCrmUsecase {
  constructor(private readonly solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository) {}

  async execute(input: DeletarSolicitacaoCpfCrmUsecaseInput): Promise<void> {
    const solicitacao = await this.solicitacaoCpfCrmRepository.deletar(input.idSolicitacao);

    if (!solicitacao) {
      throw new ValidationError(
        [
          {
            path: ['idSolicitacao'],
            message: 'Solicitação não encontrada.',
          },
        ],
        true,
      );
    }
  }
}
