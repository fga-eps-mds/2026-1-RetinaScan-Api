import type { FastifySchema } from 'fastify';
import {
  conflictResponse,
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const uploadExamImagesSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Upload de imagens de fundo de olho',
  description:
    'Envia imagens do olho direito (`olhoDireito`) e/ou esquerdo (`olhoEsquerdo`) via `multipart/form-data`. Aceita `image/jpeg` ou `image/png`. Cada lateralidade aceita no máximo um arquivo.',
  consumes: ['multipart/form-data'],
  params: {
    type: 'object',
    required: ['examId'],
    properties: {
      examId: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      olhoDireito: { type: 'string', format: 'binary' },
      olhoEsquerdo: { type: 'string', format: 'binary' },
    },
  },
  response: {
    201: {
      type: 'object',
      additionalProperties: true,
      description: 'Lista de imagens criadas, com chave de storage e lateralidade.',
      example: {
        imagens: [
          {
            id: '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
            idExame: '123e4567-e89b-12d3-a456-426614174000',
            lateralidadeOlho: 'OD',
            qualidadeImg: 'PENDENTE',
          },
          {
            id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
            idExame: '123e4567-e89b-12d3-a456-426614174000',
            lateralidadeOlho: 'OE',
            qualidadeImg: 'PENDENTE',
          },
        ],
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
    409: conflictResponse,
    500: internalErrorResponse,
  },
};
