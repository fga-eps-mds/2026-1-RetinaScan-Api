import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

// Documentação da rota responsável pela remoção de notificações do usuário autenticado.
export const deleteNotificationSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Remove notificação',
  description: 'Remove a notificação informada se pertencer ao usuário autenticado.',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    204: { type: 'null', description: 'Notificação removida.' },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
    500: internalErrorResponse,
  },
};
