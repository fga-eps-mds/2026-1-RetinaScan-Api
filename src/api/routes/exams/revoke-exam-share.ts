import type { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod';
import { RevokeExamShareUseCase } from '@/modules/exam';
import { 
  DrizzleExamShareRepository, 
  DrizzleExamesRepository, 
  DrizzleUsuariosRepository 
} from '@/infra/database/drizzle/repositories';

const revokeShareParamsSchema = z.object({
  examId: z.string().uuid('ID do exame inválido.'),
  shareId: z.string().uuid('ID de compartilhamento inválido.'),
});

export async function revokeExamShare(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Usuário não autenticado',
    });
  }

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
    const shareRepo = new DrizzleExamShareRepository();
    const examRepo = new DrizzleExamesRepository();
    const userRepo = new DrizzleUsuariosRepository();
    const useCase = new RevokeExamShareUseCase(shareRepo, examRepo, userRepo);

    await useCase.execute({ 
      shareId: paramsResult.data.shareId,
      requesterId: userId,
    });

    return reply.status(200).send({
      message: 'Acesso revogado com sucesso.',
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message: error.message || 'Erro ao revogar compartilhamento.',
    });
  }
}
