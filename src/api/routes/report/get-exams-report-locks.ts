import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { container } from '@/infra/container';
import { ValidationError } from '@/shared/errors';

const querySchema = z.object({
  examIds: z
    .string()
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().uuid({ message: 'examId inválido.' }))
        .min(1)
        .max(100),
    ),
});

export type ExamEditingLocksResponse = {
  locks: Record<
    string,
    {
      isBeingEdited: boolean;
      editor: { userId: string; nome: string } | null;
    }
  >;
};

export async function getExamEditingLocks(request: FastifyRequest, reply: FastifyReply) {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues, true);
  }

  const { examIds } = parsed.data;

  const service = container.resolve('reportEditingPresenceService');
  const presences = await service.getMany(examIds);

  const locks: ExamEditingLocksResponse['locks'] = {};

  for (let i = 0; i < examIds.length; i++) {
    const presence = presences[i];
    locks[examIds[i]] = {
      isBeingEdited: !!presence,
      editor: presence ? { userId: presence.userId, nome: presence.nome } : null,
    };
  }

  return reply.status(200).send({ locks });
}
