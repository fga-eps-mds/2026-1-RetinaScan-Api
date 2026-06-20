import type { InscricaoMedicoRepository } from '@/modules/users/repositories/users-repository';
import type { UsuariosRepository } from '@/modules/users/repositories';
import type { InviteTokenService } from '@/shared/services/invite-token-service';
import type { CryptographyService } from '@/shared/services/cryptography-service';
import { NotFoundError } from '@/shared/errors/not-found-error';
import { ConflictError } from '@/shared/errors/conflict-error';
import { UnauthorizedError } from '@/shared/errors/unauthorized-error';
import type { InscricaoMedico } from '@/modules/users/domain';

export type SubmeterInscricaoUseCaseInput = {
  token: string;
  nomeCompleto: string;
  cpf: string;
  crm: string;
  dtNascimento: string;
  senha: string;
};

export class SubmeterInscricaoUsecase {
  constructor(
    private readonly inscricaoRepo: InscricaoMedicoRepository,
    private readonly usuariosRepo: UsuariosRepository,
    private readonly inviteTokenService: InviteTokenService,
    private readonly cryptographyService: CryptographyService,
  ) {}

  /**
   * Submete os dados da inscrição a partir do token do convite: valida o token, exige que a
   * inscrição esteja em `CONVITE_ENVIADO` e que CPF/CRM ainda não estejam cadastrados, e guarda
   * a senha criptografada (a conta só é criada depois, na aprovação pelo admin).
   *
   * @throws UnauthorizedError se o token é inválido ou expirou
   * @throws NotFoundError se a inscrição do token não existe
   * @throws ConflictError se o convite já foi utilizado ou se o CPF/CRM já está cadastrado
   */
  async execute(input: SubmeterInscricaoUseCaseInput): Promise<void> {
    const payload = await this.verifyToken(input.token);
    const inscricao = await this.getInscricao(payload.sub);
    this.assertStatus(inscricao);
    await this.assertCpfDisponivel(input.cpf);
    await this.assertCrmDisponivel(input.crm);
    const { encryptedText } = this.cryptographyService.encrypt({ text: input.senha });

    await this.inscricaoRepo.submeter({
      id: inscricao.id,
      nomeCompleto: input.nomeCompleto,
      cpf: input.cpf,
      crm: input.crm,
      dtNascimento: input.dtNascimento,
      encryptedPassword: encryptedText,
      submittedAt: new Date(),
    });
  }

  private async verifyToken(token: string) {
    try {
      return await this.inviteTokenService.verify(token);
    } catch {
      throw new UnauthorizedError('Token inválido ou expirado');
    }
  }

  private async getInscricao(id: string): Promise<InscricaoMedico> {
    const inscricao = await this.inscricaoRepo.findById(id);
    if (!inscricao) throw new NotFoundError('Inscrição não encontrada');
    return inscricao;
  }

  private assertStatus(inscricao: InscricaoMedico): void {
    if (inscricao.status !== 'CONVITE_ENVIADO') {
      throw new ConflictError('Este convite já foi utilizado');
    }
  }

  private async assertCpfDisponivel(cpf: string): Promise<void> {
    if (await this.usuariosRepo.findByCpf(cpf)) throw new ConflictError('CPF já cadastrado');
  }

  private async assertCrmDisponivel(crm: string): Promise<void> {
    if (await this.usuariosRepo.findByCrm(crm)) throw new ConflictError('CRM já cadastrado');
  }
}
