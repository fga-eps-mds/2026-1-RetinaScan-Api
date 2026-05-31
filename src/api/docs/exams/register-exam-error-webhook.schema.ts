import type { FastifySchema } from 'fastify';
import {
  internalErrorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const registerExamErrorWebhookSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Webhook de erro da IA',
  description:
    'Endpoint chamado pelo serviço de IA para reportar falhas no processamento do exame.',
  params: {
    type: 'object',
    required: ['examId'],
    properties: {
      examId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['exam_id', 'error'],
    properties: {
      exam_id: { type: 'string', minLength: 1 },
      error: { type: 'string', minLength: 1 },
      task_id: { type: 'string', minLength: 1 },
      task_name: { type: 'string', minLength: 1 },
      traceback: { type: 'string' },
      args: {
        type: 'object',
        additionalProperties: true,
      },
    },
  },
  response: {
    204: { type: 'null', description: 'Erro registrado.' },
    400: validationErrorResponse,
    404: notFoundResponse,
    500: internalErrorResponse,
  },
};
