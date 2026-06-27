import { auth } from '@/lib/auth';
import type { InscricaoMedicoRepository } from '@/modules/users/repositories/users-repository';
import type { CryptographyService } from '@/shared/services/cryptography-service';
import { NotFoundError } from '@/shared/errors/not-found-error';
import { ConflictError } from '@/shared/errors/conflict-error';
import { ValidationError } from '@/shared/errors/validation-error';
import type { InscricaoMedico } from '@/modules/users/domain';

export type AvaliarInscricaoUseCaseInput = {
  inscricaoId: string;
  adminId: string;
  decisao: 'APROVADA' | 'REJEITADA';
  motivoRejeicao?: string;
};

export class AvaliarInscricaoUsecase {
  constructor(
    private readonly inscricaoRepo: InscricaoMedicoRepository,
    private readonly cryptographyService: CryptographyService,
  ) {}

  /**
   * Aprova ou rejeita uma inscrição pendente. Na aprovação, descriptografa a senha guardada e
   * cria a conta do usuário (via better-auth) antes de marcar a inscrição como avaliada; na
   * rejeição, o motivo é obrigatório.
   *
   * @throws NotFoundError se a inscrição não existe
   * @throws ConflictError se a inscrição não está pendente
   * @throws ValidationError se a decisão é REJEITADA sem motivo
   */
  async execute(input: AvaliarInscricaoUseCaseInput): Promise<void> {
    const inscricao = await this.getInscricao(input.inscricaoId);
    this.assertPendente(inscricao);

    if (input.decisao === 'APROVADA') {
      await this.aprovar(inscricao, input.adminId);
    } else {
      this.assertMotivoRejeicao(input.motivoRejeicao);
      await this.rejeitar(inscricao, input.adminId, input.motivoRejeicao!);
    }
  }

  private async getInscricao(id: string): Promise<InscricaoMedico> {
    const inscricao = await this.inscricaoRepo.findById(id);
    if (!inscricao) throw new NotFoundError('Inscrição não encontrada');
    return inscricao;
  }

  private assertPendente(inscricao: InscricaoMedico): void {
    if (inscricao.status !== 'PENDENTE')
      throw new ConflictError('Esta inscrição não está pendente');
  }

  private assertMotivoRejeicao(motivo?: string): void {
    if (!motivo?.trim()) {
      throw new ValidationError([
        { path: ['motivoRejeicao'], message: 'motivoRejeicao é obrigatório' },
      ]);
    }
  }

  private async aprovar(inscricao: InscricaoMedico, adminId: string): Promise<void> {
    const { text: senha } = this.cryptographyService.decrypt({
      encryptedText: inscricao.encryptedPassword!,
    });

    await auth.api.signUpEmail({
      body: {
        name: inscricao.nomeCompleto!,
        email: inscricao.email,
        password: senha,
        cpf: inscricao.cpf!,
        crm: inscricao.crm!,
        image: '',
        dtNascimento: inscricao.dtNascimento!,
        criadoPor: adminId,
        tipoPerfil: inscricao.tipoPerfil!,
      },
    });

    await this.inscricaoRepo.avaliar({
      id: inscricao.id,
      decisao: 'APROVADA',
      analisadoPor: adminId,
      analisadoEm: new Date(),
    });
  }

  private async rejeitar(
    inscricao: InscricaoMedico,
    adminId: string,
    motivoRejeicao: string,
  ): Promise<void> {
    await this.inscricaoRepo.avaliar({
      id: inscricao.id,
      decisao: 'REJEITADA',
      analisadoPor: adminId,
      analisadoEm: new Date(),
      motivoRejeicao,
    });
  }
}
