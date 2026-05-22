import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { container } from '@/infra/container';
import { tiposPerfil } from '@/modules/users/domain';
import { ValidationError } from '@/shared/errors';
import type { ListExamsUseCase } from '@/modules/exam/use-cases/list-exams-usecase';

const querySchema = z
  .object({
    cpf: z
      .string()
      .refine((value) => cpfValidator.isValid(value), { message: 'CPF inválido.' })
      .optional(),
    nomeCompleto: z.string().trim().min(1, 'Nome inválido.').optional(),
    status: z.enum(['CRIADO', 'CONCLUIDO', 'EM_PROCESSAMENTO']).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict({ message: 'Campos inválidos.' });

export async function listExams(request: FastifyRequest, reply: FastifyReply) {
  const result = querySchema.safeParse(request.query);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const data = result.data;

  const usecase: ListExamsUseCase = container.resolve('listExamsUseCase');

  const isMedico = request.user!.tipoPerfil === tiposPerfil.MEDICO;

  const response = await usecase.execute({
    filters: {
      idUsuario: isMedico ? request.user!.id : undefined,
      cpf: data.cpf,
      nomeCompleto: data.nomeCompleto,
      status: data.status,
    },
    pagination: {
      page: data.page,
      pageSize: data.pageSize,
    },
  });

  return reply.status(200).send(response);
}
