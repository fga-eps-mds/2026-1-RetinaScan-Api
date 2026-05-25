import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import type {
  RegisterExamAiResultItem,
  RegisterExamAiResultUseCaseInput,
} from '@/modules/exam/use-cases/register-exam-ai-result-usecase';

const resultItemSchema = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  predicted_class: z.number().int(),
  predicted_label: z.string().min(1),
  confidence: z.number(),
  probabilities: z.record(z.string(), z.number()),
});

const bodySchema = z
  .object({
    total_images: z.number().int().nonnegative(),
    exam_id: z.string().min(1),
    results: z.array(resultItemSchema),
  })
  .strict({ message: 'Campos inválidos.' });

const paramsSchema = z.object({
  examId: z.string().uuid(),
});

type WebhookBody = z.infer<typeof bodySchema>;
type WebhookResultItem = z.infer<typeof resultItemSchema>;

function toUseCaseResult(item: WebhookResultItem): RegisterExamAiResultItem {
  return {
    filename: item.filename,
    contentType: item.content_type,
    predictedClass: item.predicted_class,
    predictedLabel: item.predicted_label,
    confidence: item.confidence,
    probabilities: item.probabilities,
  };
}

function toUseCaseInput(examId: string, body: WebhookBody): RegisterExamAiResultUseCaseInput {
  return {
    examId,
    payloadExamId: body.exam_id,
    totalImages: body.total_images,
    results: body.results.map(toUseCaseResult),
  };
}

export async function registerExamWebhook(
  request: FastifyRequest<{ Params: { examId: string } }>,
  reply: FastifyReply,
) {
  const paramsResult = paramsSchema.safeParse(request.params);
  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.issues, true);
  }

  const bodyResult = bodySchema.safeParse(request.body);
  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.issues, true);
  }

  const usecase = container.resolve('registerExamAiResultUseCase');
  await usecase.execute(toUseCaseInput(paramsResult.data.examId, bodyResult.data));

  return reply.status(204).send();
}
