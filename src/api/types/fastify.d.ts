import 'fastify';
import type { TipoPerfil } from '@/modules/users/domain';
import type { Server as SocketIOServer } from 'socket.io';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nomeCompleto: string;
  tipoPerfil: TipoPerfil;
}

export interface AuditTarget {
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  targetDisplay?: string | null;
}

export interface AuditRouteConfig {
  enabled: boolean;
  action: string;
  category: string;
  getDescription?: (request: import('fastify').FastifyRequest, payload?: unknown) => string;
  getTarget?: (request: import('fastify').FastifyRequest, payload?: unknown) => AuditTarget;
  getChanges?: (
    request: import('fastify').FastifyRequest,
    payload?: unknown,
  ) => Record<string, unknown> | null;
  getMetadata?: (
    request: import('fastify').FastifyRequest,
    payload?: unknown,
  ) => Record<string, unknown> | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    auditReplyPayload?: unknown;
  }

  interface FastifyContextConfig {
    audit?: AuditRouteConfig;
  }

  interface FastifyInstance {
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  }
}
