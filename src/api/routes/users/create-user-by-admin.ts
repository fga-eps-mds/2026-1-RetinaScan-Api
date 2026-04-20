import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';
import { CreateUserByAdmin } from '@/modules/users/use-cases';
import { better_auth_errors } from '@/shared/errors/better-auth-errors';
import { isValidCpf } from '@/shared/validators/is-valid-cpf';
import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';

const bodySchema = z.object({
  nomeCompleto: z.string().min(3, 'Nome inválido.'),
  email: z.string().email('Email inválido.'),
  cpf: z.string().refine(isValidCpf, {
    message: 'CPF inválido.',
  }),
  crm: z.string().min(1, 'CRM obrigatório.'),
  dtNascimento: z.string().date().pipe(z.coerce.date()),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  tipoPerfil: z.enum(['ADMIN', 'MEDICO']),
});

function getErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const maybeBody = (error as { body?: unknown }).body;

  if (typeof maybeBody !== 'object' || maybeBody === null) {
    return null;
  }

  const maybeCode = (maybeBody as { code?: unknown }).code;

  return typeof maybeCode === 'string' ? maybeCode : null;
}

export async function createUserByAdmin(request: FastifyRequest, reply: FastifyReply) {
  const result = bodySchema.safeParse(request.body);

  if (!result.success) {
    const { fieldErrors } = result.error.flatten();

    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Dados inválidos.',
      errors: fieldErrors,
    });
  }

  try {
    const body = result.data;

    const useCase = new CreateUserByAdmin(new DrizzleUsuariosRepository());

    await useCase.execute(body);

    return reply.status(201).send({
      message: 'Usuário criado com sucesso.',
    });
  } catch (error: unknown) {
    const code = getErrorCode(error);

    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: code
        ? (better_auth_errors[code] ?? 'Erro ao criar usuário.')
        : 'Erro ao criar usuário.',
    });
  }
}
