import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const rejeitarSolicitacaoCpfCrmSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Rejeita solicitação de alteração de CPF/CRM',
  description: 'Rejeita a solicitação informando o motivo. Restrito a administradores.',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['motivoRejeicao'],
    properties: {
      motivoRejeicao: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
      description: 'Solicitação rejeitada.',
      example: {
        solicitacao: {
          id: 'b8c1f3e2-5a7d-4e1b-9c2f-1a2b3c4d5e6f',
          idUsuario: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
          cpfNovo: '52998224725',
          crmNovo: null,
          status: 'REJEITADA',
          motivoRejeicao: 'Documentação anexa ilegível.',
          analisadoPor: 'd9e8f7a6-b5c4-3d2e-1f0a-9b8c7d6e5f4a',
          analisadoEm: '2026-05-25T12:00:00.000Z',
          createdAt: '2026-05-24T18:30:00.000Z',
          updatedAt: '2026-05-25T12:00:00.000Z',
        },
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
    500: internalErrorResponse,
  },
};
