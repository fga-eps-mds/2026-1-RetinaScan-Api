import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import { Sexo } from '@/modules/exam';
import { cpf } from 'cpf-cnpj-validator';

const bodySchema = z
  .object({
    nomeCompleto: z.string().min(1, 'nomeCompleto é obrigatório.'),
    cpf: z.string().refine((value) => cpf.isValid(value), { message: 'CPF inválido.' }),
    sexo: z.nativeEnum(Sexo, { message: 'sexo inválido.' }),
    dtNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dtNascimento deve ser AAAA-MM-DD.'),
    dtHora: z.string().datetime({ message: 'dtHora inválida.' }).pipe(z.coerce.date()),
    comorbidades: z.string().optional(),
    descricao: z.string().optional(),
  })
  .strict({ message: 'Campos inválidos.' });

export async function createExam(request: FastifyRequest, reply: FastifyReply) {
  const result = bodySchema.safeParse(request.body);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('createExamUseCase');

  const response = await usecase.execute({
    idUsuario: request.user!.id,
    ...result.data,
  });

  return reply.status(201).send(response);
}
