import { tiposPerfil, type SolicitacaoCpfCrm } from '@/modules/users/domain';
import type { SolicitacaoCpfCrmRepository, UsuariosRepository } from '@/modules/users/repositories';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { UnauthorizedError } from '@/shared/errors/unauthorized-error';

export type RejeitarSolicitacaoCpfCrmUsecaseInput = {
  idSolicitacao: string;
  idAdmin: string;
  motivoRejeicao: string;
};

export type RejeitarSolicitacaoCpfCrmUsecaseOutput = {
  solicitacao: SolicitacaoCpfCrm;
};

export class RejeitarSolicitacaoCpfCrmUsecase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository,
  ) {}

  async execute(
    input: RejeitarSolicitacaoCpfCrmUsecaseInput,
  ): Promise<RejeitarSolicitacaoCpfCrmUsecaseOutput> {
    const motivoRejeicao = input.motivoRejeicao.trim();

    if (!motivoRejeicao) {
      throw new ValidationError(
        [{ path: ['motivoRejeicao'], message: 'Motivo da rejeição é obrigatório' }],
        true,
      );
    }

    const admin = await this.usuariosRepository.findBy({ id: input.idAdmin });

    if (!admin) {
      throw new NotFoundError('Administrador não encontrado');
    }

    if (admin.tipoPerfil !== tiposPerfil.ADMIN) {
      throw new UnauthorizedError('Apenas administradores podem rejeitar solicitações');
    }

    const solicitacao = await this.solicitacaoCpfCrmRepository.rejeitar({
      idSolicitacao: input.idSolicitacao,
      analisadoPor: input.idAdmin,
      motivoRejeicao,
    });

    if (!solicitacao) {
      throw new NotFoundError('Solicitação não encontrada');
    }

    return { solicitacao };
  }
}
