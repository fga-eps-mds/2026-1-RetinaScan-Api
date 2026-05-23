import type { FastifyReply, FastifyRequest } from 'fastify';
import { ResetPasswordUseCase } from '@/modules/users/use-cases/reset-password';
import { resetPasswordSchema } from '@/modules/users/dtos/reset-password.dto';
import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories/drizzle-usuario-repository';
import { DrizzlePasswordResetTokenRepository } from '@/infra/database/drizzle/repositories/drizzle-password-reset-token-repository';
import { UnauthorizedError } from '@/shared/errors/unauthorized-error';

export async function resetPasswordRoute(request: FastifyRequest, reply: FastifyReply) {
  const data = resetPasswordSchema.parse(request.body);

  const usuariosRepository = new DrizzleUsuariosRepository();
  const passwordResetTokenRepository = new DrizzlePasswordResetTokenRepository();

  const useCase = new ResetPasswordUseCase(
    usuariosRepository,
    passwordResetTokenRepository
  );

  try {
    await useCase.execute(data);
    return reply.status(200).send({
      message: 'Senha atualizada com sucesso.',
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ message: error.message });
    }
    throw error;
  }
}
