import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ApiError, ValidationError } from '@/shared/errors'

export function errorHandler(
  error: FastifyError | ApiError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ValidationError) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.showMessage ? error.message : 'Invalid attributes',
      fields: error.fields,
    })
  }

  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
      ...(error.metadata && { metadata: error.metadata }),
    })
  }

  request.log.error(error)

  return reply.status(500).send({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  })
}
