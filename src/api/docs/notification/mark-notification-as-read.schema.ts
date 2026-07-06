import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

// Documentação da rota responsável por marcar uma notificação como lida.
export const markNotificationAsReadSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Marca notificação como lida',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    204: { type: 'null', description: 'Notificação marcada como lida.' },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
    500: internalErrorResponse,
  },
};
