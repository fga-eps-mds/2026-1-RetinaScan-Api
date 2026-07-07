import { PostgresHealthCheck } from '@/infra/health';
import type { FastifyReply, FastifyRequest } from 'fastify';

export default async function (request: FastifyRequest, reply: FastifyReply) {
  // Executa a verificação de disponibilidade do banco de dados.
  const postgresHealthCheck = new PostgresHealthCheck();
  const postgresStatus = await postgresHealthCheck.check();

  // Define a saúde da aplicação com base no resultado dos serviços monitorados.
  const isHealthy = [postgresStatus].every((check) => check.ok);

  reply.code(isHealthy ? 200 : 500).send({
    status: isHealthy ? 'healthy' : 'unhealthy',
    services: {
      database: postgresStatus,
    },
  });
}
