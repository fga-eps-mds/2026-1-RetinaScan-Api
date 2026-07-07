import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';
import { SearchDoctorsUseCase } from '@/modules/users/use-cases/search-users-created-by-admin';
import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';

// Define os filtros de pesquisa e parâmetros de paginação aceitos pela rota.
const searchSchema = z.object({
  nome: z.string().optional(),
  crm: z.string().optional(),
  email: z.string().email('Email inválido.').optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  tipoPerfil: z.enum(['MEDICO', 'ESPECIALISTA']).optional(),
});

export async function searchMedicosByAdmin(request: FastifyRequest, reply: FastifyReply) {
  const queryResult = searchSchema.safeParse(request.query);

  // Impede a execução da busca quando os parâmetros recebidos são inválidos.
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
    const { nome, crm, email, page, pageSize, tipoPerfil } = queryResult.data;
    const adminId = request.user?.id;

    // Garante que apenas usuários autenticados possam realizar a pesquisa administrativa.
    if (!adminId) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Usuário não autenticado',
      });
    }

    // Cria as dependências necessárias para executar a busca dos médicos.
    const usuariosRepository = new DrizzleUsuariosRepository();
    const useCase = new SearchDoctorsUseCase(usuariosRepository);

    const result = await useCase.execute({
      adminId,
      criteria: {
        name: nome,
        crm,
        email,
        tipoPerfil,
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
