import type { FastifySchema } from 'fastify';
import {
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from '../shared/error-responses';

export const generatePdfReportSchema: FastifySchema = {
  summary: 'Gera e baixa o laudo do exame em PDF',
  description:
    'Agrega os dados do exame, preenche o template HTML dinâmico e consome o serviço do Gotenberg para retornar um documento PDF.',
  tags: ['Report'],
  params: {
    type: 'object',
    properties: {
      examId: { type: 'string', format: 'uuid' },
    },
    required: ['examId'],
  },
  response: {
    200: {
      description: 'Arquivo PDF gerado com sucesso',
      type: 'string',
      format: 'binary',
    },
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
    500: internalErrorResponse,
  },
};
