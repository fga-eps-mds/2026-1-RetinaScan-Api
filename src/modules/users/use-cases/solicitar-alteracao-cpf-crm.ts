import { tiposPerfil, solicitacaoStatus, type SolicitacaoStatus } from '@/modules/users/domain';
import type { SolicitacaoCpfCrmRepository, UsuariosRepository } from '@/modules/users/repositories';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { ConflictError } from '@/shared/errors/conflict-error';
import { isValidCpf } from '@/shared/validators/is-valid-cpf';

export type SolicitarAlteracaoCpfCrmUsecaseInput = {
  idUsuario: string;
  cpfNovo: string;
  crmNovo: string;
};

export type SolicitarAlteracaoCpfCrmUsecaseOutput = {
  idSolicitacao: string;
  status: SolicitacaoStatus;
};

export class SolicitarAlteracaoCpfCrmUsecase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly solicitacaoCpfCrmRepository: SolicitacaoCpfCrmRepository,
  ) {}

  async execute(
    input: SolicitarAlteracaoCpfCrmUsecaseInput,
  ): Promise<SolicitarAlteracaoCpfCrmUsecaseOutput> {
    const cpfNormalizado = input.cpfNovo.replace(/\D/g, '');
    const crmNormalizado = input.crmNovo.trim();

    this.validateInput(cpfNormalizado, crmNormalizado);

    const usuario = await this.usuariosRepository.findBy({ id: input.idUsuario });

    if (!usuario) {
      throw new NotFoundError('Usuário não encontrado');
    }

    if (usuario.tipoPerfil !== tiposPerfil.MEDICO) {
      throw new ConflictError('Apenas médicos podem solicitar alteração de CPF/CRM');
    }

    const solicitacaoPendente =
      await this.solicitacaoCpfCrmRepository.findPendenteByUsuario(input.idUsuario);

    if (solicitacaoPendente) {
      throw new ConflictError('Usuário já possui solicitação pendente');
    }

    const usuarioComCpf = await this.usuariosRepository.findByCpf(cpfNormalizado);

    if (usuarioComCpf && usuarioComCpf.id !== input.idUsuario) {
      throw new ConflictError('CPF já cadastrado');
    }

    const usuarioComCrm = await this.usuariosRepository.findByCrm(crmNormalizado);

    if (usuarioComCrm && usuarioComCrm.id !== input.idUsuario) {
      throw new ConflictError('CRM já cadastrado');
    }

    const solicitacao = await this.solicitacaoCpfCrmRepository.criar({
      idUsuario: input.idUsuario,
      cpfNovo: cpfNormalizado,
      crmNovo: crmNormalizado,
    });

    return {
      idSolicitacao: solicitacao.id,
      status: solicitacao.status ?? solicitacaoStatus.PENDENTE,
    };
  }

  private validateInput(cpfNovo: string, crmNovo: string): void {
    const fields = [] as { path: (string | number)[]; message: string }[];

    if (!isValidCpf(cpfNovo)) {
      fields.push({ path: ['cpfNovo'], message: 'CPF inválido' });
    }

    if (!/^[A-Za-z0-9./-]{4,20}$/.test(crmNovo)) {
      fields.push({ path: ['crmNovo'], message: 'CRM inválido' });
    }

    if (fields.length > 0) {
      throw new ValidationError(fields, true);
    }
  }
}