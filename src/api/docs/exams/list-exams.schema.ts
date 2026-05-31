import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const listExamsSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Lista exames',
  description:
    'Lista exames com paginação. Médicos veem apenas seus próprios exames; admins veem todos.',
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      cpf: { type: 'string', description: 'Filtra por CPF do paciente.' },
      nomeCompleto: { type: 'string', minLength: 1 },
      status: { type: 'string', enum: ['CRIADO', 'CONCLUIDO', 'EM_PROCESSAMENTO'] },
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
      description: 'Página de exames com metadados de paginação.',
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            nomeCompleto: 'João da Silva',
            olho: 'AO',
            status: 'CONCLUIDO',
            dtCriacao: '2026-05-20T10:15:00.000Z',
          },
          {
            id: '223e4567-e89b-12d3-a456-426614174111',
            nomeCompleto: 'Maria Souza',
            olho: 'OD',
            status: 'EM_PROCESSAMENTO',
            dtCriacao: '2026-05-22T09:00:00.000Z',
          },
          {
            id: '323e4567-e89b-12d3-a456-426614174222',
            nomeCompleto: 'Carlos Lima',
            olho: null,
            status: 'CRIADO',
            dtCriacao: '2026-05-25T08:45:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 3,
          totalPages: 1,
        },
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
