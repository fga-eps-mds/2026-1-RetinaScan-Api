import { NotificationService } from '@/modules/notification/services';
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
    private readonly notificationService: NotificationService,
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

    return { solicitacao };
  }
}
