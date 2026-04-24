import { container } from '@/infra/container';
import { isValidCpf } from '@/shared/validators/is-valid-cpf';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

const bodySchema = z
  .object({
    cpfNovo: z.string().refine(isValidCpf, {
      message: 'CPF inválido.',
    }),
    crmNovo: z.string().trim().min(1, 'CRM obrigatório.'),
  })
  .strict({ message: 'Campos inválidos.' });

export async function solicitarAlteracaoCpfCrmRoute(request: FastifyRequest, reply: FastifyReply) {
  const result = bodySchema.safeParse(request.body);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('solicitarAlteracaoCpfCrmUsecase');

  const response = await usecase.execute({
    idUsuario: request.user!.id,
    cpfNovo: result.data.cpfNovo,
    crmNovo: result.data.crmNovo,
  });

  return reply.status(201).send(response);
}