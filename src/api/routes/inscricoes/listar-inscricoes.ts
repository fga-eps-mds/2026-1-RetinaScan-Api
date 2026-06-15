import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors/validation-error';
import { inscricaoStatus, type InscricaoStatus } from '@/modules/users/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

const statusValues = Object.keys(inscricaoStatus) as [InscricaoStatus, ...InscricaoStatus[]];

const querySchema = z
  .object({
    status: z.enum(statusValues).optional(),
  })
  .strict();

export async function listarInscricoesRoute(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = querySchema.safeParse(request.query);
  if (!result.success) throw new ValidationError(result.error.issues, true);

  const usecase = container.resolve('listarInscricoesUsecase');
  const inscricoes = await usecase.execute({ status: result.data.status });

  await reply.status(200).send({ data: inscricoes });
}
