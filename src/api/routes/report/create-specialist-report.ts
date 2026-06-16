import { container } from '@/infra/container';
import { auth } from '@/lib/auth';
import { tiposPerfil } from '@/modules/users/domain';
import { UnauthorizedError, ValidationError } from '@/shared/errors';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

const paramsSchema = z
  .object({
    examId: z.string().uuid('examId inválido.'),
  })
  .strict({ message: 'Parâmetros inválidos.' });

const bodySchema = z
  .object({
    texto: z.string().trim().min(1, 'texto é obrigatório.'),
    html: z.string().trim().min(1, 'html é obrigatório.'),
    json: z.record(z.string(), z.unknown()).nullable(),
    resultadoIaValido: z.boolean(),
  })
  .strict({ message: 'Campos inválidos.' });

export async function createSpecialistReport(request: FastifyRequest, reply: FastifyReply) {
  const user = await auth.api.getSession({
    headers: request.headers,
  });

  if (user?.user.tipoPerfil !== tiposPerfil.ESPECIALISTA) {
    throw new UnauthorizedError('Acesso negado. Perfil de especialista é necessário.');
  }

  const paramsResult = paramsSchema.safeParse(request.params);
  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.errors, true);
  }

  const bodyResult = bodySchema.safeParse(request.body);
  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.errors, true);
  }

  const useCase = container.resolve('createSpecialistReportUseCase');

  const response = await useCase.execute({
    examId: paramsResult.data.examId,
    specialistId: user.user.id,
    texto: bodyResult.data.texto,
    html: bodyResult.data.html,
    conteudo: bodyResult.data.json ?? {},
    resultadoIaValido: bodyResult.data.resultadoIaValido,
  });

  return reply.status(201).send(response);
}
