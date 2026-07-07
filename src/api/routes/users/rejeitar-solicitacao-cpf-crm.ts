import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

// Define o identificador da solicitação recebido pela URL.
const paramsSchema = z
  .object({
    id: z.string().min(1, 'Id da solicitação obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

// Define os dados obrigatórios enviados para rejeitar uma solicitação.
const bodySchema = z
  .object({
    motivoRejeicao: z.string().trim().min(1, 'Motivo da rejeição obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

export async function rejeitarSolicitacaoCpfCrmRoute(request: FastifyRequest, reply: FastifyReply) {
  const paramsResult = paramsSchema.safeParse(request.params);

  // Valida se o identificador da solicitação possui o formato esperado.
  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.issues, true);
  }

  const bodyResult = bodySchema.safeParse(request.body);

  // Valida os dados necessários para concluir a rejeição da solicitação.
  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.issues, true);
  }

  // Obtém o caso de uso responsável pela regra de rejeição da solicitação CPF/CRM.
  const usecase = container.resolve('rejeitarSolicitacaoCpfCrmUsecase');

  const response = await usecase.execute({
    idSolicitacao: paramsResult.data.id,
    idAdmin: request.user!.id,
    motivoRejeicao: bodyResult.data.motivoRejeicao,
  });

  return reply.status(200).send(response);
}
