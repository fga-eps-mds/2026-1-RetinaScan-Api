import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';
import { SearchDoctorsUseCase } from '@/modules/users/use-cases/search-users-created-by-admin';
import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';

// Validação dos parâmetros
const searchSchema = z.object({
  nome: z.string().optional(),
  crm: z.string().optional(),
  email: z.string().email('Email inválido.').optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export async function searchMedicosByAdmin(request: FastifyRequest, reply: FastifyReply) {
  const queryResult = searchSchema.safeParse(request.query);

  if (!queryResult.success) {
    const { fieldErrors } = queryResult.error.flatten();
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Parâmetros de busca inválidos.',
      errors: fieldErrors,
    });
  }

  try {
    const { nome, crm, email, page, pageSize } = queryResult.data;
    const adminId = request.user?.id;

    if (!adminId) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Usuário não autenticado',
      });
    }

    const usuariosRepository = new DrizzleUsuariosRepository();
    const useCase = new SearchDoctorsUseCase(usuariosRepository);

    const result = await useCase.execute({
      adminId,
      criteria: {
        name: nome,
        crm,
        email,
      },
      pagination: {
        page,
        pageSize,
      },
    });

    return reply.status(200).send(result);
  } catch {
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro ao pesquisar médicos.',
    });
  }
}
