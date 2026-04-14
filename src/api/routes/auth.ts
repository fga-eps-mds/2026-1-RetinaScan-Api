import { auth } from '@/lib/auth';
import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';

// eslint-disable-next-line @typescript-eslint/require-await
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/auth/*',
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const url = new URL(request.url, `http://${request.headers.host}`);

      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) headers.append(key, String(value));
      }

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
};
