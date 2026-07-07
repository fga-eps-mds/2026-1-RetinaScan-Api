import { container } from '@/infra/container';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

// Define os filtros e opções de ordenação disponíveis para consulta administrativa.
const querySchema = z
  .object({
    status: z.enum(['PENDENTE', 'APROVADA', 'REJEITADA']).optional(),
    idUsuario: z.string().optional(),
    nome: z.string().trim().min(1).optional(),
    email: z.string().trim().min(1).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'nomeCompleto']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .strict({ message: 'Parâmetros inválidos.' });

export async function listarSolicitacoesCpfCrmAdminRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = querySchema.safeParse(request.query);

  // Garante que apenas parâmetros válidos sejam encaminhados ao caso de uso.
  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  // Obtém o caso de uso responsável pela busca das solicitações CPF/CRM.
  const usecase = container.resolve('listarSolicitacoesCpfCrmUsecase');

  const response = await usecase.execute(result.data);

  return reply.status(200).send(response);
}
