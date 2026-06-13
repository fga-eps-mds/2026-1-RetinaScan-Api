import { container } from '@/infra/container';
import { ConflictError } from '@/shared/errors/conflict-error';
import { ValidationError } from '@/shared/errors/validation-error';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

const bodySchema = z
  .object({
    email: z.string().email('Email inválido.'),
    tipoPerfil: z.enum(['MEDICO', 'ESPECIALISTA']).optional(),
  })
  .strict({ message: 'Campos inválidos.' });

export async function enviarConviteInscricaoRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = bodySchema.safeParse(request.body);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('enviarConviteInscricaoUsecase');

  try {
    await usecase.execute({
      ...result.data,
      adminId: request.user?.id,
    });

    return reply.status(201).send({ message: 'Convite enviado com sucesso.' });
  } catch (error: unknown) {
    if (error instanceof ConflictError) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: error.message,
      });
    }

    throw error;
  }
}
