import type { FastifySchema } from 'fastify';
import {
  internalErrorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '../shared/error-responses';

// Estrutura de cada resultado de inferência retornado pelo serviço de IA.
const resultItem = {
  type: 'object',
  required: [
    'filename',
    'content_type',
    'predicted_class',
    'predicted_label',
    'confidence',
    'probabilities',
  ],
  properties: {
    filename: { type: 'string', minLength: 1 },
    content_type: { type: 'string', minLength: 1 },
    predicted_class: { type: 'integer' },
    predicted_label: { type: 'string', minLength: 1 },
    confidence: { type: 'number' },
    probabilities: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
  },
} as const;

// Documentação do webhook utilizado para registrar os resultados da IA.
export const registerExamWebhookSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Webhook de resultado da IA',
  description:
    'Endpoint chamado pelo serviço de IA para registrar o resultado da inferência das imagens do exame. Sem autenticação de usuário.',
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
    required: ['total_images', 'exam_id', 'results'],
    properties: {
      total_images: { type: 'integer', minimum: 0 },
      exam_id: { type: 'string', minLength: 1 },
      results: { type: 'array', items: resultItem },
    },
  },
  response: {
    204: { type: 'null', description: 'Resultado registrado com sucesso.' },
    400: validationErrorResponse,
    404: notFoundResponse,
    500: internalErrorResponse,
  },
};
