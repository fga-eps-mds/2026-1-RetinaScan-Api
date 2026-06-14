import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors/validation-error';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

const bodySchema = z
  .object({
    convites: z
      .array(
        z.object({
          email: z.string().email('Email inválido'),
          nome: z.string().min(1, 'Nome é obrigatório'),
          tipoPerfil: z.enum(['MEDICO', 'ESPECIALISTA']).optional(),
        }),
      )
      .min(1, 'Ao menos um convite é obrigatório'),
  })
  .strict();

export async function enviarConvitesEmLoteRoute(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = bodySchema.safeParse(request.body);
  if (!result.success) throw new ValidationError(result.error.issues, true);

  const usecase = container.resolve('enviarConvitesEmLoteUsecase');
  const output = await usecase.execute({
    convites: result.data.convites,
    adminId: request.user!.id,
  });

  await reply.status(201).send(output);
}
