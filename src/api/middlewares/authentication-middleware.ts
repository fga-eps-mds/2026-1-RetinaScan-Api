import { auth } from '@/lib/auth';
import { AuthenticationError } from '@/shared/errors';
import type { TipoPerfil } from '@/modules/users/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Middleware responsável por validar a sessão do usuário antes de acessar rotas protegidas.
export async function authenticationMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw new AuthenticationError('Usuário não autenticado');
  }

  const user = session.user;

  // Disponibiliza no contexto da requisição apenas os dados necessários para autorização e uso nas rotas.
  request.user = {
    id: user.id,
    email: user.email,
    nomeCompleto: user.name,
    tipoPerfil: user.tipoPerfil as TipoPerfil,
  };
}
