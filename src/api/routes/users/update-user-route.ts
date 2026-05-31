import z from 'zod';
import { container } from '@/infra/container';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '@/shared/errors';

const bodySchema = z
  .object({
    nomeCompleto: z.string().min(3, 'Nome inválido.').optional(),
    email: z.string().email('Email inválido.').optional(),
    dtNascimento: z.string().date().optional(),
    senhaAtual: z.string().min(6, 'Senha atual deve ter no mínimo 6 caracteres.').optional(),
    novaSenha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres.').optional(),
  })
  .strict({ message: 'Campos inválidos.' })
  .refine(({ senhaAtual, novaSenha }) => Boolean(senhaAtual) === Boolean(novaSenha), {
    message: 'senhaAtual e novaSenha devem ser enviadas juntas.',
    path: ['senhaAtual'],
  });

export async function updateUserRoute(request: FastifyRequest, reply: FastifyReply) {
  const result = bodySchema.safeParse(request.body);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const { senhaAtual, novaSenha, ...data } = result.data;

  const usecase = container.resolve('updateUserUsecase');

  const response = await usecase.execute({
    idUsuario: request.user!.id,
    data,
    senhaAtual,
    novaSenha,
    headers: fromNodeHeaders(request.headers),
  });

  return reply.status(200).send(response);
}
