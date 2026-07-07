import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

// Define os filtros disponíveis para consulta das notificações do usuário.
const querySchema = z
  .object({
    status: z.enum(['todas', 'nao-lidas', 'lidas']).optional().default('todas'),
    tipo: z.string().trim().min(1, 'tipo não pode ser vazio.').optional(),
    limit: z.coerce
      .number()
      .int('limit deve ser um número inteiro.')
      .min(1, 'limit deve ser maior ou igual a 1.')
      .max(100, 'limit deve ser menor ou igual a 100.')
      .optional()
      .default(20),
  })
  .strict({ message: 'Query params inválidos.' });

export async function listNotifications(request: FastifyRequest, reply: FastifyReply) {
  // Valida os filtros recebidos antes de buscar as notificações.
  const result = querySchema.safeParse(request.query);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  // Resolve o caso de uso responsável pela consulta das notificações do usuário.
  const useCase = container.resolve('listMyNotificationsUsecase');

  const notifications = await useCase.execute({
    usuarioId: request.user!.id,
    status: result.data.status,
    tipo: result.data.tipo,
    limit: result.data.limit,
  });

  return reply.send(notifications);
}
