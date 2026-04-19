import type { TipoPerfil } from '@/modules/users/domain';
import { AuthenticationError, UnauthorizedError } from '@/shared/errors';
import type { FastifyReply, FastifyRequest } from 'fastify';

export function authorizationMiddleware(allowedRoles: TipoPerfil[]) {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    if (!request.user) {
      throw new AuthenticationError('Usuário não autenticado');
    }

    if (!allowedRoles.includes(request.user.tipoPerfil)) {
      throw new UnauthorizedError('Usuário não autorizado');
    }
  };
}
