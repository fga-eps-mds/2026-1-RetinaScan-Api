import crypto from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import type { PasswordResetTokenRepository } from '@/modules/users/repositories/password-reset-token-repository';
import type { ResetPasswordDTO } from '@/modules/users/dtos/reset-password.dto';
import { UnauthorizedError } from '@/shared/errors/unauthorized-error';

export class ResetPasswordUseCase {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository
  ) {}

  async execute(input: ResetPasswordDTO): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');

    const tokenRecord = await this.passwordResetTokenRepository.findByTokenHash(tokenHash);

    if (!tokenRecord) {
      throw new UnauthorizedError('Token inválido ou expirado.');
    }

    if (tokenRecord.usedAt !== null) {
      throw new UnauthorizedError('Token já foi utilizado.');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedError('Token expirado.');
    }

    const newPasswordHash = await hashPassword(input.password);

    await this.usuariosRepository.updatePassword(tokenRecord.idUsuario, newPasswordHash);

    await this.passwordResetTokenRepository.markAsUsed(tokenRecord.id);
  }
}
