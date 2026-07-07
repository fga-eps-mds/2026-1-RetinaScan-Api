import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors/validation-error';
import { inscricaoStatus, type InscricaoStatus } from '@/modules/users/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

// Converte os status disponíveis do domínio para o formato aceito pelo Zod.
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
  // Valida os filtros recebidos antes de consultar as inscrições.
  const result = querySchema.safeParse(request.query);
  if (!result.success) throw new ValidationError(result.error.issues, true);

  // Resolve o caso de uso responsável pela busca das inscrições.
  const usecase = container.resolve('listarInscricoesUsecase');
  const inscricoes = await usecase.execute({ status: result.data.status });

  await reply.status(200).send({ data: inscricoes });
}
