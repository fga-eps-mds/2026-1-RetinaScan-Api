import type { FastifyInstance } from 'fastify';
import { listLogsWithFilters } from './logs/list-logs-with-filters';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';

export async function logsRoute(app: FastifyInstance) {
  app.get(
    '/logs',
    { preHandler: [authenticationMiddleware, authorizationMiddleware(['ADMIN'])] },
    listLogsWithFilters,
  );
}
