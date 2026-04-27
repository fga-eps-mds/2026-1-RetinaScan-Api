import type { SolicitacaoCpfCrm, SolicitacaoStatus } from '@/modules/users/domain';
import type { SolicitacaoCpfCrmRepository } from '@/modules/users/repositories';

export type ListarSolicitacoesCpfCrmUsecaseInput = {
  status?: SolicitacaoStatus;
  idUsuario?: string;
};

export type ListarSolicitacoesCpfCrmUsecaseOutput = {
  solicitacoes: Array<SolicitacaoCpfCrm & { nomeCompleto: string; email: string }>;
};

export class ListarSolicitacoesCpfCrmUsecase {
  constructor(private readonly solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository) {}

  async execute(
    input?: ListarSolicitacoesCpfCrmUsecaseInput,
  ): Promise<ListarSolicitacoesCpfCrmUsecaseOutput> {
    const solicitacoes = await this.solicitacaoCpfCrmRepository.listar({
      ...input,
      relations: true,
    });

    return {
      solicitacoes: solicitacoes.map(({ usuario, ...solicitacao }) => ({
        ...solicitacao,
        nomeCompleto: usuario!.nomeCompleto,
        email: usuario!.email,
      })),
    };
  }
}
