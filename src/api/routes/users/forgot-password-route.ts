import type { FastifyReply, FastifyRequest } from 'fastify';
import { ForgotPasswordUseCase } from '@/modules/users/use-cases/forgot-password';
import { forgotPasswordSchema } from '@/modules/users/dtos/forgot-password.dto';
import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories/drizzle-usuario-repository';
import { DrizzlePasswordResetTokenRepository } from '@/infra/database/drizzle/repositories/drizzle-password-reset-token-repository';
import { MockMessageService } from '@/shared/services/message-service';

export async function forgotPasswordRoute(request: FastifyRequest, reply: FastifyReply) {
  const data = forgotPasswordSchema.parse(request.body);

  const usuariosRepository = new DrizzleUsuariosRepository();
  const passwordResetTokenRepository = new DrizzlePasswordResetTokenRepository();
  const messageService = new MockMessageService();

  const useCase = new ForgotPasswordUseCase(
    usuariosRepository,
    passwordResetTokenRepository,
    messageService
  );

  await useCase.execute(data);

  return reply.status(200).send({
    message: 'Se o usuário existir, um e-mail de recuperação foi enviado.',
  });
}
