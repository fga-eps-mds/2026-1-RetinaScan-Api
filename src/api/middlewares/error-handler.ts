import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ApiError, ValidationError } from '@/shared/errors';

// Centraliza o tratamento de erros da API, padronizando as respostas enviadas ao cliente.
export function errorHandler(
  error: FastifyError | ApiError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  // Trata erros de validação retornando os campos que precisam de correção.
  if (error instanceof ValidationError) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.showMessage ? error.message : 'Invalid attributes',
      fields: error.fields,
    });
  }

  // Trata erros de domínio da aplicação mantendo o status HTTP e informações adicionais.
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
      ...(error.metadata && { metadata: error.metadata }),
    });
  }

  // Registra erros não previstos e retorna uma resposta genérica de servidor.
  request.log.error(error);

  return reply.status(500).send({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
}
