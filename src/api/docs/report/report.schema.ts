import type { FastifySchema } from 'fastify';
import {
  conflictResponse,
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

// Parâmetros compartilhados pelas rotas de criação e atualização do laudo do especialista.
const specialistReportParams = {
  type: 'object',
  additionalProperties: false,
  required: ['examId'],
  properties: {
    examId: {
      type: 'string',
      format: 'uuid',
      description: 'ID do exame.',
    },
  },
} as const;

// Estrutura do corpo da requisição para cadastro e atualização do laudo.
const specialistReportBody = {
  type: 'object',
  additionalProperties: false,
  required: ['texto', 'resultadoIaConfirmado'],
  properties: {
    texto: {
      type: 'string',
      minLength: 1,
      description: 'Texto do laudo emitido pelo especialista.',
    },
    resultadoIaConfirmado: {
      type: 'boolean',
      description: 'Indica se o especialista confirma o resultado predito pela IA.',
      default: false,
    },
  },
} as const;

// Estrutura da resposta retornada após criar ou atualizar um laudo.
const specialistReportResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    examId: { type: 'string', format: 'uuid' },
    specialistId: { type: 'string' },
    texto: { type: 'string' },
    resultadoIaConfirmado: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  additionalProperties: true,
  example: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    examId: '123e4567-e89b-12d3-a456-426614174111',
    specialistId: 'usr_01JX9YQKQ8Y8P5Y3H5W2N7ABCD',
    texto:
      'Exame compatível com alterações retinianas leves, recomendando avaliação clínica correlacionada.',
    resultadoIaConfirmado: true,
    createdAt: '2026-06-06T20:00:00.000Z',
    updatedAt: '2026-06-06T20:00:00.000Z',
  },
} as const;

// Documentação da rota responsável pela criação de um laudo de especialista.
export const createSpecialistReportSchema: FastifySchema = {
  tags: ['Laudos de Especialista'],
  summary: 'Cria laudo do especialista',
  description: 'Cria o laudo do especialista para um exame pertencente à sua jurisdição.',
  params: specialistReportParams,
  body: specialistReportBody,
  response: {
    201: specialistReportResponse,
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      additionalProperties: true,
      example: {
        message: 'Exame não encontrado',
      },
    },
    409: conflictResponse,
    500: internalErrorResponse,
  },
};

// Documentação da rota responsável pela atualização de um laudo de especialista.
export const updateSpecialistReportSchema: FastifySchema = {
  tags: ['Laudos de Especialista'],
  summary: 'Atualiza laudo do especialista',
  description:
    'Atualiza o laudo do especialista para um exame pertencente à sua jurisdição, desde que esteja dentro do prazo permitido.',
  params: specialistReportParams,
  body: specialistReportBody,
  response: {
    200: specialistReportResponse,
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      additionalProperties: true,
      example: {
        message: 'Laudo do especialista não encontrado',
      },
    },
    409: conflictResponse,
    500: internalErrorResponse,
  },
};
