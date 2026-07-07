import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors/validation-error';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

// Define o formato dos convites recebidos e garante pelo menos um convite válido.
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
  // Valida os dados recebidos antes de executar a operação de negócio.
  const result = bodySchema.safeParse(request.body);
  if (!result.success) throw new ValidationError(result.error.issues, true);

   // Resolve o caso de uso responsável pelo envio dos convites.
  const usecase = container.resolve('enviarConvitesEmLoteUsecase');
  const output = await usecase.execute({
    convites: result.data.convites,
    adminId: request.user!.id,
  });

  await reply.status(201).send(output);
}
