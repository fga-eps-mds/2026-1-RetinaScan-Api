import 'fastify';
import type { TipoPerfil } from '@/modules/users/domain';
import type { Server as SocketIOServer } from 'socket.io';

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

  interface FastifyInstance {
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  }
}
