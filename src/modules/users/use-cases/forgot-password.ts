import crypto from 'node:crypto';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import type { PasswordResetTokenRepository } from '@/modules/users/repositories/password-reset-token-repository';
import type { IMessageService } from '@/shared/services/message-service';
import type { ForgotPasswordDTO } from '@/modules/users/dtos/forgot-password.dto';

export class ForgotPasswordUseCase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly messageService: IMessageService
  ) {}

  async execute(input: ForgotPasswordDTO): Promise<void> {
    let usuario = null;

    if (input.email) {
      usuario = await this.usuariosRepository.findByEmail(input.email);
    } else if (input.crm) {
      usuario = await this.usuariosRepository.findByCrm(input.crm);
    }

    if (!usuario) {
      return;
    }

    await this.passwordResetTokenRepository.invalidateAllFromUser(usuario.id);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await this.passwordResetTokenRepository.criar({
      idUsuario: usuario.id,
      tokenHash,
      expiresAt,
    });

    // Enviar mensagem (mockada) para o e-mail do usuário
    // O link aponta para uma rota do front-end contendo o token em formato texto puro
    const frontendUrl = process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
    
    // Mostramos que foi enviado, mesmo se a busca foi por CRM, o envio é para o e-mail ou sistema de mensagem interno do usuário.
    await this.messageService.sendPasswordResetLink(usuario.email, resetLink);
  }
}
