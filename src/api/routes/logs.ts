import type { FastifyInstance } from 'fastify';
import { listLogsWithFilters } from './log/list-logs-with-filters';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';

// eslint-disable-next-line @typescript-eslint/require-await
export async function logsRoute(app: FastifyInstance) {
  app.get(
    '/logs',
    { preHandler: [authenticationMiddleware, authorizationMiddleware(['ADMIN'])] },
    listLogsWithFilters,
  );
}
