import type { NotificationService } from '@/modules/notification/services';
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
    private readonly notificationService: NotificationService,
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

    const updateData = {
      ...(solicitacao.cpfNovo && { cpf: solicitacao.cpfNovo }),
      ...(solicitacao.crmNovo && { crm: solicitacao.crmNovo }),
    };

    const usuarioAtualizado = await this.usuariosRepository.update(
      solicitacao.idUsuario,
      updateData,
    );

    if (!usuarioAtualizado) {
      throw new NotFoundError('Usuário da solicitação não encontrado');
    }

    await this.notificationService.notificar({
      usuarioId: solicitacao.idUsuario,
      tipo: 'status_solicitacao_cadastral_atualizado',
      titulo: 'Status da solicitação cadastral atualizado',
      mensagem: `Sua solicitação de alteração de CPF/CRM foi ${solicitacao.status}.`,
      dados: {
        solicitacaoId: solicitacao.id,
        status: solicitacao.status,
      },
      chaveDedupe: `status-solicitacao-cadastral:${solicitacao.id}:${solicitacao.status}`,
    });

    return { solicitacao, notificacaoEnviada: true };
  }
}
