import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  legacyErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '../shared/error-responses';

export const shareExamSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Compartilha um exame com um médico',
  description: 'Permite que um Especialista compartilhe o exame com um Médico solicitante.',
  params: {
    type: 'object',
    properties: {
      examId: { type: 'string', format: 'uuid', description: 'ID do Exame' },
    },
    required: ['examId'],
  },
  body: {
    type: 'object',
    required: ['emailDestino'],
    properties: {
      emailDestino: {
        type: 'string',
        format: 'email',
        description: 'E-mail do médico que receberá o acesso',
      },
      expiraEm: {
        type: 'string',
        format: 'date-time',
        description: 'Data de expiração do acesso (opcional)',
        nullable: true,
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            examId: { type: 'string' },
            medicoDestinoId: { type: 'string' },
            compartilhadoPor: { type: 'string' },
            expiraEm: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
    400: legacyErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
    409: legacyErrorResponse,
    500: internalErrorResponse,
  },
};
