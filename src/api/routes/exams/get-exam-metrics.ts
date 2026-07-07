import { container } from '@/infra/container';
import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';
import { tiposPerfil } from '@/modules/users/domain';

// Define os filtros opcionais utilizados para consultar as métricas de exames.
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

  // Garante que o intervalo informado pelo usuário seja cronologicamente válido.
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

  // Médicos visualizam apenas métricas dos próprios exames; outros perfis possuem visão global.
  const isMedico = request.user!.tipoPerfil === tiposPerfil.MEDICO;
  const idUsuario = isMedico ? request.user!.id : undefined;

  // Resolve o caso de uso responsável pelo cálculo das métricas agregadas.
  const useCase = container.resolve('getExamMetricsUseCase');

  const metrics = await useCase.execute({ startDate, endDate, idUsuario });

  return reply.status(200).send(metrics);
}
