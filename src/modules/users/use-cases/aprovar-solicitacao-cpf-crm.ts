import { tiposPerfil, type SolicitacaoCpfCrm } from '@/modules/users/domain';
import type { SolicitacaoCpfCrmRepository, UsuariosRepository } from '@/modules/users/repositories';
import { NotFoundError } from '@/shared/errors';
import { UnauthorizedError } from '@/shared/errors/unauthorized-error';

export type AprovarSolicitacaoCpfCrmUsecaseInput = {
  idSolicitacao: string;
  idAdmin: string;
};

export type AprovarSolicitacaoCpfCrmUsecaseOutput = {
  solicitacao: SolicitacaoCpfCrm;
  notificacaoEnviada: boolean;
};

export class AprovarSolicitacaoCpfCrmUsecase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository,
  ) {}

  async execute(
    input: AprovarSolicitacaoCpfCrmUsecaseInput,
  ): Promise<AprovarSolicitacaoCpfCrmUsecaseOutput> {
    const admin = await this.usuariosRepository.findBy({ id: input.idAdmin });

    if (!admin) {
      throw new NotFoundError('Administrador não encontrado');
    }

    if (admin.tipoPerfil !== tiposPerfil.ADMIN) {
      throw new UnauthorizedError('Apenas administradores podem aprovar solicitações');
    }

    const solicitacao = await this.solicitacaoCpfCrmRepository.aprovar({
      idSolicitacao: input.idSolicitacao,
      analisadoPor: input.idAdmin,
    });

    if (!solicitacao) {
      throw new NotFoundError('Solicitação não encontrada');
    }

    const usuarioAtualizado = await this.usuariosRepository.update(solicitacao.idUsuario, {
      cpf: solicitacao.cpfNovo ?? undefined,
      crm: solicitacao.crmNovo ?? undefined,
    });

    if (!usuarioAtualizado) {
      throw new NotFoundError('Usuário da solicitação não encontrado');
    }

    return { solicitacao, notificacaoEnviada: true };
  }
}