import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';

// Define e valida o identificador da notificação recebido pela rota.
const paramsSchema = z
  .object({
    id: z.string().uuid({ message: 'id da notificação inválido.' }),
  })
  .strict({ message: 'Parâmetros inválidos.' });

type Params = z.input<typeof paramsSchema>;

export async function deleteNotification(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply,
) {
  // Valida o parâmetro antes de executar a exclusão da notificação.
  const result = paramsSchema.safeParse(request.params);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  // Resolve o caso de uso responsável pela remoção da notificação.
  const useCase = container.resolve('deleteNotificationUseCase');

  await useCase.execute({
    notificacaoId: result.data.id,
    usuarioId: request.user!.id,
  });

  return reply.status(204).send();
}
