import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';

const paramsSchema = z.object({
  examId: z.string().uuid({ message: 'examId inválido.' }),
});

const bodySchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId inválido.' }),
});

export async function releaseReportLock(request: FastifyRequest, reply: FastifyReply) {
  const parsedParams = paramsSchema.safeParse(request.params);
  if (!parsedParams.success) {
    throw new ValidationError(parsedParams.error.issues, true);
  }

  const parsedBody = bodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    throw new ValidationError(parsedBody.error.issues, true);
  }

  const { examId } = parsedParams.data;
  const { sessionId } = parsedBody.data;

  const service = container.resolve('reportEditingPresenceService');

  await service.release({
    examId,
    userId: request.user!.id,
    sessionId,
  });

  return reply.status(204).send();
}
