import { PostgresHealthCheck } from '@/infra/health';
import { FastifyReply, FastifyRequest } from 'fastify';

export default async function (request: FastifyRequest, reply: FastifyReply) {
  const postgresHealthCheck = new PostgresHealthCheck();
  const postgresStatus = await postgresHealthCheck.check();

  const isHealthy = [
    postgresStatus,
  ].every(check => check.ok);

  reply
    .code(isHealthy ? 200 : 500)
    .send({
      status: isHealthy ? 'healthy' : 'unhealthy',
      services: {
        database: postgresStatus,
      }
  });
}