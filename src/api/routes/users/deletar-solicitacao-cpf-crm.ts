import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

const paramsSchema = z
  .object({
    idSolicitacao: z.string().uuid('Parâmetros inválidos.'),
  })
  .strict({ message: 'Parâmetros inválidos.' });

export async function deletarSolicitacaoCpfCrmAdminRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = paramsSchema.safeParse(request.params);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('deletarSolicitacaoCpfCrmUsecase');

  await usecase.execute({
    idSolicitacao: result.data.idSolicitacao,
  });

  return reply.status(204).send();
}
