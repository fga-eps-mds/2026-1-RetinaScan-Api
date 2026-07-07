import { auth } from '@/lib/auth';
import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import { recoverByCrmHandler } from './auth/recover-by-crm';

// Registra as rotas relacionadas à autenticação e integra o handler do provedor de autenticação com o Fastify.
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/auth/*',
    schema: { hide: true },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const url = new URL(request.url, `http://${request.headers.host}`);

      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) headers.append(key, String(value));
      }

      // Converte a requisição do Fastify para o formato esperado pelo handler de autenticação.
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.body ? JSON.stringify(request.body) : undefined,
      });

      const response = await auth.handler(req);

      reply.status(response.status);

      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      const body = await response.text();
      reply.send(body || null);
    },
  });

  // Rota customizada para recuperação de acesso utilizando CRM.
  app.post('/auth/recover-by-crm', recoverByCrmHandler);
};
