import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

const paramsSchema = z
  .object({
    id: z.string().min(1, 'Id da solicitação obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

export async function aprovarSolicitacaoCpfCrmRoute(request: FastifyRequest, reply: FastifyReply) {
  const result = paramsSchema.safeParse(request.params);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('aprovarSolicitacaoCpfCrmUsecase');

  const response = await usecase.execute({
    idSolicitacao: result.data.id,
    idAdmin: request.user!.id,
  });

  return reply.status(200).send(response);
}