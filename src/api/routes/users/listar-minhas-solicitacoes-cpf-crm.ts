import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

const querySchema = z
  .object({
    status: z.enum(['PENDENTE', 'APROVADA', 'REJEITADA']).optional(),
  })
  .strict({ message: 'Parâmetros inválidos.' });

export async function listarMinhasSolicitacoesCpfCrmRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = querySchema.safeParse(request.query);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('listarSolicitacoesCpfCrmUsecase');

  const response = await usecase.execute({
    ...result.data,
    idUsuario: request.user!.id,
  });

  return reply.status(200).send(response);
}