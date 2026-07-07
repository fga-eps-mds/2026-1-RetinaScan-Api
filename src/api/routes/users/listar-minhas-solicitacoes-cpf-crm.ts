import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

// Define os filtros opcionais aceitos para consulta das solicitações do usuário.
const querySchema = z
  .object({
    status: z.enum(['PENDENTE', 'APROVADA', 'REJEITADA']).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .strict({ message: 'Parâmetros inválidos.' });

export async function listarMinhasSolicitacoesCpfCrmRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = querySchema.safeParse(request.query);

  // Interrompe a execução caso os parâmetros recebidos não sejam válidos.
  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  // Obtém o caso de uso através do container de dependências.
  const usecase = container.resolve('listarSolicitacoesCpfCrmUsecase');

  const response = await usecase.execute({
    ...result.data,
    idUsuario: request.user!.id,
  });

  return reply.status(200).send(response);
}
