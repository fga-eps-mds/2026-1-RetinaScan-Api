import type { FastifyRequest, FastifyReply } from 'fastify';
import { ListMySharesUseCase } from '@/modules/exam';
import {
  DrizzleExamShareRepository,
  DrizzleUsuariosRepository,
} from '@/infra/database/drizzle/repositories';

export async function listMyShares(request: FastifyRequest, reply: FastifyReply) {
  // Garante que apenas usuários autenticados possam consultar seus próprios compartilhamentos.
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Usuário não autenticado',
    });
  }

  try {
    // Cria as dependências necessárias e delega a regra de negócio ao use case.
    const shareRepo = new DrizzleExamShareRepository();
    const userRepo = new DrizzleUsuariosRepository();
    const useCase = new ListMySharesUseCase(shareRepo, userRepo);

    const result = await useCase.execute({ compartilhadoPorId: userId });

    return reply.status(200).send({
      data: result,
    });
  } catch {
    // Retorna uma mensagem genérica para evitar exposição de detalhes internos da aplicação.
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro ao listar seus compartilhamentos ativos.',
    });
  }
}
