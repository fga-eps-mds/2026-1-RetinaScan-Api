import { auth } from '@/lib/auth';
import { AuthenticationError } from '@/shared/errors';
import type { TipoPerfil } from '@/modules/users/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticationMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw new AuthenticationError('Usuário não autenticado');
  }

  const user = session.user;

  request.user = {
    id: user.id,
    email: user.email,
    nomeCompleto: user.name,
    tipoPerfil: user.tipoPerfil as TipoPerfil,
  };
}
