import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';
import { RevokeExamShareUseCase } from '@/modules/exam';
import {
  DrizzleExamShareRepository,
  DrizzleExamesRepository,
  DrizzleUsuariosRepository,
} from '@/infra/database/drizzle/repositories';

const revokeShareParamsSchema = z.object({
  examId: z.string().uuid('ID do exame inválido.'),
  shareId: z.string().uuid('ID de compartilhamento inválido.'),
});

export async function revokeExamShare(request: FastifyRequest, reply: FastifyReply) {
  // Garante que apenas usuários autenticados possam revogar compartilhamentos.
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Usuário não autenticado',
    });
  }

  // Valida os identificadores recebidos antes de executar a operação de revogação.
  const paramsResult = revokeShareParamsSchema.safeParse(request.params);
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
    // Instancia as dependências e delega as regras de autorização e revogação ao use case.
    const shareRepo = new DrizzleExamShareRepository();
    const examRepo = new DrizzleExamesRepository();
    const userRepo = new DrizzleUsuariosRepository();
    const useCase = new RevokeExamShareUseCase(shareRepo, examRepo, userRepo);

    const result = await useCase.execute({
      shareId: paramsResult.data.shareId,
      requesterId: userId,
    });

    return reply.status(200).send({
      message: 'Acesso revogado com sucesso.',
      data: {
        medicoDestinoEmail: result.emailDestino,
      },
    });
  } catch (error) {
    // Mantém os códigos de erro definidos pela aplicação e evita respostas genéricas quando possível.
    if (error instanceof Error) {
      let statusCode = 500;
      if ('statusCode' in error && typeof error.statusCode === 'number') {
        statusCode = error.statusCode;
      }

      return reply.status(statusCode).send({
        statusCode,
        error: error.name || 'Internal Server Error',
        message: error.message || 'Erro ao revogar compartilhamento.',
      });
    }

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro desconhecido ao revogar compartilhamento.',
    });
  }
}
