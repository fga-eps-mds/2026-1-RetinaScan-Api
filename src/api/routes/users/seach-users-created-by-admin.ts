import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';
import { SearchDoctorsUseCase } from '@/modules/users/use-cases/search-users-created-by-admin';
import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';

// Validação dos parâmetros
const searchSchema = z.object({
  nome: z.string().optional(),
  crm: z.string().optional(),
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
    const { nome, crm } = queryResult.data;
    
    //O adminId SEMPRE vem da sessão autenticada, NUNCA dos parâmetros da requisição.
    const adminId = request.user!.id; 

    const usuariosRepository = new DrizzleUsuariosRepository();
    const useCase = new SearchDoctorsUseCase(usuariosRepository as any);

    const result = await useCase.execute({ adminId, nome, crm} as any);

    return reply.status(200).send(result);
  } catch (error: unknown) {
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro ao pesquisar médicos.',
    });
  }
}