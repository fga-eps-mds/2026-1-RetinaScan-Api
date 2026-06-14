import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import {
  DrizzleExamesRepository,
  DrizzleUsuariosRepository,
  DrizzleExamShareRepository,
} from '@/infra/database/drizzle/repositories';
import { ShareExamUseCase } from '@/modules/exam';
import { UnauthorizedError } from '@/shared/errors';

const paramsSchema = z.object({
  examId: z.string().uuid(),
});

const bodySchema = z.object({
  emailDestino: z.string().email(),
  expiraEm: z.string().datetime().nullable().optional(),
});

export async function shareExam(request: FastifyRequest, reply: FastifyReply) {
  const { examId } = paramsSchema.parse(request.params);
  const { emailDestino, expiraEm } = bodySchema.parse(request.body);

  if (!request.user) {
    throw new UnauthorizedError('Usuário não autenticado');
  }

  const examRepository = new DrizzleExamesRepository();
  const userRepository = new DrizzleUsuariosRepository();
  const examShareRepository = new DrizzleExamShareRepository();

  const useCase = new ShareExamUseCase(examRepository, userRepository, examShareRepository);

  const share = await useCase.execute({
    examId,
    emailDestino,
    compartilhadoPorId: request.user.id,
    expiraEm: expiraEm ? new Date(expiraEm) : null,
  });

  return reply.status(201).send({
    message: 'Exame compartilhado com sucesso.',
    data: {
      id: share.id,
      examId: share.examId,
      medicoDestinoId: share.medicoDestinoId,
      compartilhadoPor: share.compartilhadoPor,
      expiraEm: share.expiraEm ? share.expiraEm.toISOString() : null,
    },
  });
}
