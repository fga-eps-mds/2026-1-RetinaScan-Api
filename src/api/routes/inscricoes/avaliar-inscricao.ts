import { container } from '@/infra/container';
import type { AvaliarInscricaoUsecase } from '@/modules/users/use-cases/avaliar-inscricao-usecase';
import { ValidationError } from '@/shared/errors/validation-error';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.discriminatedUnion('decisao', [
  z.object({ decisao: z.literal('APROVADA') }),
  z.object({
    decisao: z.literal('REJEITADA'),
    motivoRejeicao: z.string().min(1, 'Motivo de rejeição é obrigatório'),
  }),
]);

export async function avaliarInscricaoRoute(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const paramsResult = paramsSchema.safeParse(request.params);
  if (!paramsResult.success) throw new ValidationError(paramsResult.error.issues, true);

  const bodyResult = bodySchema.safeParse(request.body);
  if (!bodyResult.success) throw new ValidationError(bodyResult.error.issues, true);

  const usecase: AvaliarInscricaoUsecase = container.resolve('avaliarInscricaoUsecase');

  await usecase.execute({
    inscricaoId: paramsResult.data.id,
    adminId: request.user!.id,
    decisao: bodyResult.data.decisao,
    motivoRejeicao:
      'motivoRejeicao' in bodyResult.data ? bodyResult.data.motivoRejeicao : undefined,
  });

  await reply.status(200).send({ message: 'Inscrição avaliada com sucesso.' });
}
