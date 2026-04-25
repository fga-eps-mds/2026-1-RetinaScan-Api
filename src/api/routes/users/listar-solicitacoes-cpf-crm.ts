import { container } from '@/infra/container';
import { tiposPerfil } from '@/modules/users/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';
import { ValidationError } from '@/shared/errors';

const querySchema = z
  .object({
    status: z.enum(['PENDENTE', 'APROVADA', 'REJEITADA']).optional(),
    idUsuario: z.string().optional(),
  })
  .strict({ message: 'Parâmetros inválidos.' });

export async function listarSolicitacoesCpfCrmRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = querySchema.safeParse(request.query);

  if (!result.success) {
    throw new ValidationError(result.error.issues, true);
  }

  const usecase = container.resolve('listarSolicitacoesCpfCrmUsecase');

  const isMedico = request.user!.tipoPerfil === tiposPerfil.MEDICO;

  const response = await usecase.execute({
    ...result.data,
    idUsuario: isMedico ? request.user!.id : result.data.idUsuario,
  });

  return reply.status(200).send(response);
}