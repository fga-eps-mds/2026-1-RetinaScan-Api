import { container } from '@/infra/container';
import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

const querySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict({ message: 'Parâmetros inválidos.' });

export async function getExamMetrics(request: FastifyRequest, reply: FastifyReply) {
  const result = querySchema.safeParse(request.query);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const { startDate, endDate } = result.data;

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

  const useCase = container.resolve('getExamMetricsUseCase');

  const metrics = await useCase.execute({ startDate, endDate });

  return reply.status(200).send(metrics);
}
