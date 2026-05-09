import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import { cpf } from 'cpf-cnpj-validator';

const querySchema = z
  .object({
    cpf: z.string().refine((value) => cpf.isValid(value), { message: 'CPF inválido.' }),
  })
  .strict({ message: 'Campos inválidos.' });

type QueryType = z.infer<typeof querySchema>;

export async function getExamsByCpf(request: FastifyRequest<{ Querystring: QueryType }>, reply: FastifyReply) {
  const result = querySchema.safeParse(request.query);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('getExamsByCpfUseCase');

  const response = await usecase.execute(result.data);

  return reply.status(200).send(response);
}