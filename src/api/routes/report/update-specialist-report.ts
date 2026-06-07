import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError, ValidationError } from '@/shared/errors';
import { container } from '@/infra/container';
import { auth } from '@/lib/auth';
import { tiposPerfil } from '@/modules/users/domain';

const paramsSchema = z
  .object({
    examId: z.string().uuid('examId inválido.'),
  })
  .strict({ message: 'Parâmetros inválidos.' });

const bodySchema = z
  .object({
    texto: z.string().trim().min(1, 'texto é obrigatório.'),
    resultadoIAValido: z.boolean(),
  })
  .strict({ message: 'Campos inválidos.' });

export async function updateSpecialistReport(request: FastifyRequest, reply: FastifyReply) {
  const paramsResult = paramsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.errors, true);
  }

  const bodyResult = bodySchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.errors, true);
  }

  const user = await auth.api.getSession({
    headers: request.headers,
  });

  if (user?.user.tipoPerfil !== tiposPerfil.ESPECIALISTA) {
    throw new UnauthorizedError('Acesso negado. Perfil de especialista é necessário.');
  }

  const useCase = container.resolve('updateSpecialistReportUseCase');

  const response = await useCase.execute({
    actorId: user.user.id,
    examId: paramsResult.data.examId,
    texto: bodyResult.data.texto,
    resultadoIAValido: bodyResult.data.resultadoIAValido,
  });

  return reply.status(200).send(response);
}
