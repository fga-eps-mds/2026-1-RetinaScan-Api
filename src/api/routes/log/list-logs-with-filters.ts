import { container } from '@/infra/container';
import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

// Define os filtros e parâmetros de paginação aceitos pela consulta de logs.
const querySchema = z
  .object({
    action: z.string().trim().min(1).optional(),
    actorUserId: z.string().trim().min(1).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict({ message: 'Parâmetros inválidos.' });

export async function listLogsWithFilters(request: FastifyRequest, reply: FastifyReply) {
  // Valida os filtros recebidos antes de executar a consulta.
  const result = querySchema.safeParse(request.query);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const { action, actorUserId, startDate, endDate, page, pageSize } = result.data;

  // Garante que o intervalo de datas informado seja válido.
  if (startDate && endDate && startDate > endDate) {
    throw new ValidationError(
      [
        {
          path: ['startDate'],
          message: 'startDate não pode ser maior que endDate.',
        },
      ],
      true,
    );
  }

  // Resolve o caso de uso responsável pela busca dos logs com filtros e paginação.
  const useCase = container.resolve('listLogsWithFiltersUseCase');

  const logs = await useCase.execute({
    filters: {
      action,
      actorUserId,
      startDate,
      endDate,
    },
    pagination: {
      page,
      pageSize,
    },
  });

  return reply.status(200).send(logs);
}
