import { NotFoundError } from '@/shared/errors';
import type { UsuariosRepository } from '../repositories/users-repository';
import type { MaskingService } from '@/shared/services';

export interface RecoverPasswordByCrmInput {
  crm: string;
}

export interface RecoverPasswordByCrmOutput {
  email: string;
  maskedEmail: string;
}

export class RecoverPasswordByCrmUseCase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly maskingService: MaskingService,
  ) {}

  /**
   * Resolve o e-mail de um usuário a partir do CRM para o fluxo de recuperação de senha,
   * retornando também a versão mascarada para exibição.
   *
   * @throws NotFoundError se nenhum usuário tem o CRM informado
   */
  async execute({ crm }: RecoverPasswordByCrmInput): Promise<RecoverPasswordByCrmOutput> {
    const user = await this.usuariosRepository.findByCrm(crm);

    if (!user) {
      throw new NotFoundError('Nenhum usuário encontrado com o CRM informado');
    }

    const maskedEmail = this.maskingService.maskEmail(user.email);

    return {
      email: user.email,
      maskedEmail,
    };
  }
}
