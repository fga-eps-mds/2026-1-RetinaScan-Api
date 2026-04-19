import 'fastify';
import type { TipoPerfil } from '@/modules/users/domain';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nomeCompleto: string;
  tipoPerfil: TipoPerfil;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
