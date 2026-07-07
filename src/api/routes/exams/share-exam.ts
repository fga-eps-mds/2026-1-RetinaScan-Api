import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import {
  DrizzleExamesRepository,
  DrizzleUsuariosRepository,
  DrizzleExamShareRepository,
} from '@/infra/database/drizzle/repositories';
import { ShareExamUseCase } from '@/modules/exam';
import { UnauthorizedError, ValidationError } from '@/shared/errors';

const paramsSchema = z.object({
  examId: z.string().uuid(),
});

const bodySchema = z.object({
  emailDestino: z.string().email(),
  expiraEm: z.string().datetime().nullable().optional(),
});

export async function shareExam(request: FastifyRequest, reply: FastifyReply) {
  // Valida o identificador do exame recebido na URL.
  const paramsResult = paramsSchema.safeParse(request.params);
  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.errors);
  }

  // Valida os dados necessários para criar o compartilhamento.
  const bodyResult = bodySchema.safeParse(request.body);
  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.errors);
  }

  const { examId } = paramsResult.data;
  const { emailDestino, expiraEm } = bodyResult.data;

  // Garante que somente usuários autenticados possam compartilhar exames.
  if (!request.user) {
    throw new UnauthorizedError('Usuário não autenticado');
  }

  // Instancia os repositórios e cria o caso de uso responsável pela regra de compartilhamento.
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
