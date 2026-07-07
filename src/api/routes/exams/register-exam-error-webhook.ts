import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';

const bodySchema = z
  .object({
    exam_id: z.string().min(1),
    error: z.string().min(1),
    task_id: z.string().min(1).optional(),
    task_name: z.string().min(1).optional(),
    traceback: z.string().optional(),
    args: z.record(z.string(), z.unknown()).optional(),
  })
  .strict({ message: 'Campos inválidos.' });

const paramsSchema = z.object({
  examId: z.string().uuid(),
});

export async function registerExamErrorWebhook(
  request: FastifyRequest<{ Params: { examId: string } }>,
  reply: FastifyReply,
) {
  // Valida o identificador do exame antes de processar o erro recebido.
  const paramsResult = paramsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.issues, true);
  }

  // Valida o payload enviado pelo serviço de IA para garantir a estrutura esperada.
  const bodyResult = bodySchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.issues, true);
  }

  // Registra o erro através do caso de uso responsável pelo histórico de falhas da IA.
  const usecase = container.resolve('registerExamAiErrorUseCase');

  await usecase.execute({
    examId: paramsResult.data.examId,
    payloadExamId: bodyResult.data.exam_id,
    errorMessage: bodyResult.data.error,
    traceback: bodyResult.data.traceback,
    taskId: bodyResult.data.task_id,
    taskName: bodyResult.data.task_name,
    args: bodyResult.data.args,
  });

  return reply.status(204).send();
}
