import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import type { GetExamDetailsUseCase } from '@/modules/exam/use-cases/get-exam-details-usecase';

// Define a validação dos parâmetros necessários para consultar um exame específico.
const paramsSchema = z.object({
  examId: z.string().uuid({ message: 'examId inválido.' }),
});

export async function getExamDetails(request: FastifyRequest, reply: FastifyReply) {
  const parsed = paramsSchema.safeParse(request.params);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues, true);
  }

  // Resolve o caso de uso responsável por buscar os detalhes do exame.
  const useCase: GetExamDetailsUseCase = container.resolve('getExamDetailsUseCase');

  const response = await useCase.execute({
    examId: parsed.data.examId,
    // Envia os dados do usuário autenticado para aplicação das regras de permissão.
    requester: {
      id: request.user!.id,
      tipoPerfil: request.user!.tipoPerfil,
    },
  });

  return reply.status(200).send(response);
}
