import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';
import { ListAvailableDoctorsUseCase } from '@/modules/users/use-cases';
import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';

// Valida os parâmetros opcionais utilizados na busca de médicos.
const listDoctorsQuerySchema = z.object({
  busca: z.string().optional(),
});

export async function listAvailableDoctorsRoute(request: FastifyRequest, reply: FastifyReply) {
  const queryResult = listDoctorsQuerySchema.safeParse(request.query);

  // Retorna erro de validação caso os parâmetros recebidos não estejam no formato esperado.
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
    // Instancia o repositório e o caso de uso responsável pela regra de busca dos médicos.
    const repository = new DrizzleUsuariosRepository();
    const useCase = new ListAvailableDoctorsUseCase(repository);

    const busca = queryResult.data.busca;
    const requesterId = request.user?.id;
    // Garante que a requisição possui um usuário autenticado.
    if (!requesterId) throw new Error('User not found in request');

    const result = await useCase.execute({
      busca,
      requesterId,
    });

    return reply.status(200).send({ data: result });
  } catch (error) {
    console.error('ERRO NA ROTA:', error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro ao buscar médicos disponíveis.',
    });
  }
}
