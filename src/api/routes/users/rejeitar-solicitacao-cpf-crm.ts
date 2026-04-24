import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

const paramsSchema = z
  .object({
    id: z.string().min(1, 'Id da solicitação obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

const bodySchema = z
  .object({
    motivoRejeicao: z.string().trim().min(1, 'Motivo da rejeição obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

export async function rejeitarSolicitacaoCpfCrmRoute(request: FastifyRequest, reply: FastifyReply) {
  const paramsResult = paramsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.issues, true);
  }

  const bodyResult = bodySchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.issues, true);
  }

  const usecase = container.resolve('rejeitarSolicitacaoCpfCrmUsecase');

  const response = await usecase.execute({
    idSolicitacao: paramsResult.data.id,
    idAdmin: request.user!.id,
    motivoRejeicao: bodyResult.data.motivoRejeicao,
  });

  return reply.status(200).send(response);
}