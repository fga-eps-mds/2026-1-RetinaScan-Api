import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';
import { ListExamSharesUseCase } from '@/modules/exam';
import {
  DrizzleExamShareRepository,
  DrizzleUsuariosRepository,
} from '@/infra/database/drizzle/repositories';

const listExamSharesParamsSchema = z.object({
  examId: z.string().uuid('ID do exame inválido.'),
});

export async function listExamShares(request: FastifyRequest, reply: FastifyReply) {
  // Valida os parâmetros recebidos antes de executar a busca dos compartilhamentos.
  const paramsResult = listExamSharesParamsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    const { fieldErrors } = paramsResult.error.flatten();
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Parâmetros inválidos.',
      errors: fieldErrors,
    });
  }

  try {
    // Instancia as dependências necessárias e executa a regra de negócio através do use case.
    const shareRepo = new DrizzleExamShareRepository();
    const userRepo = new DrizzleUsuariosRepository();
    const useCase = new ListExamSharesUseCase(shareRepo, userRepo);

    const result = await useCase.execute({ examId: paramsResult.data.examId });

    return reply.status(200).send({
      data: result,
    });
  } catch {
    // Evita expor detalhes internos da aplicação em erros inesperados.
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro ao listar compartilhamentos.',
    });
  }
}
