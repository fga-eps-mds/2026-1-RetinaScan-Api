import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';
import { env } from '@/env';

const paramsSchema = z.object({
  examId: z.string().uuid({ message: 'examId inválido.' }),
});

const bodySchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId inválido.' }),
});

export async function acquireReportLock(request: FastifyRequest, reply: FastifyReply) {
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

  const result = await service.acquire({
    examId,
    userId: request.user!.id,
    nome: request.user!.nomeCompleto,
    sessionId,
    ttlSeconds: env.SPECIALIST_REPORT_EDITING_TTL_SECONDS,
  });

  if (result.acquired) {
    return reply.status(200).send({
      acquired: true,
      editor: {
        userId: result.presence.userId,
        nome: result.presence.nome,
      },
    });
  }

  return reply.status(200).send({
    acquired: false,
    editor: {
      userId: result.presence.userId,
      nome: result.presence.nome,
    },
  });
}
