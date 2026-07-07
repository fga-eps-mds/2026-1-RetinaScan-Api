import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError, ValidationError } from '@/shared/errors';
import { container } from '@/infra/container';
import { auth } from '@/lib/auth';
import { tiposPerfil } from '@/modules/users/domain';

// Validação do identificador do exame que terá o relatório atualizado.
const paramsSchema = z
  .object({
    examId: z.string().uuid('examId inválido.'),
  })
  .strict({ message: 'Parâmetros inválidos.' });

// Validação dos dados enviados para atualização do relatório do especialista.
const bodySchema = z
  .object({
    texto: z.string().trim().min(1, 'texto é obrigatório.'),
    resultadoIaValido: z.boolean(),
    html: z.string().trim().min(1, 'html é obrigatório.'),
    json: z.record(z.string(), z.unknown()).nullable(),
  })
  .strict({ message: 'Campos inválidos.' });

export async function updateSpecialistReport(request: FastifyRequest, reply: FastifyReply) {
  const paramsResult = paramsSchema.safeParse(request.params);

  if (!paramsResult.success) {
    throw new ValidationError(paramsResult.error.errors, true);
  }

  const bodyResult = bodySchema.safeParse(request.body);

  if (!bodyResult.success) {
    throw new ValidationError(bodyResult.error.errors, true);
  }

  const user = await auth.api.getSession({
    headers: request.headers,
  });

  // Garante que apenas especialistas possam alterar relatórios médicos.
  if (user?.user.tipoPerfil !== tiposPerfil.ESPECIALISTA) {
    throw new UnauthorizedError('Acesso negado. Perfil de especialista é necessário.');
  }

  // Resolve o caso de uso responsável pela atualização do relatório.
  const useCase = container.resolve('updateSpecialistReportUseCase');

  const response = await useCase.execute({
    actorId: user.user.id,
    examId: paramsResult.data.examId,
    texto: bodyResult.data.texto,
    resultadoIaValido: bodyResult.data.resultadoIaValido,
    html: bodyResult.data.html,
    conteudo: bodyResult.data.json ?? {},
  });

  return reply.status(200).send(response);
}
