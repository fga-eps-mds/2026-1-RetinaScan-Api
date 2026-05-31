import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const listarMinhasSolicitacoesCpfCrmSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Lista minhas solicitações de alteração',
  description: 'Lista as solicitações de alteração de CPF/CRM do médico autenticado.',
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['PENDENTE', 'APROVADA', 'REJEITADA'] },
    },
  },
  response: {
    200: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
      example: [
        {
          id: 'b8c1f3e2-5a7d-4e1b-9c2f-1a2b3c4d5e6f',
          idUsuario: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
          cpfNovo: '52998224725',
          crmNovo: null,
          status: 'PENDENTE',
          motivoRejeicao: null,
          analisadoPor: null,
          analisadoEm: null,
          createdAt: '2026-05-24T18:30:00.000Z',
          updatedAt: '2026-05-24T18:30:00.000Z',
        },
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
          idUsuario: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
          cpfNovo: null,
          crmNovo: 'CRM/DF 99999',
          status: 'REJEITADA',
          motivoRejeicao: 'Documentação anexa ilegível.',
          analisadoPor: 'd9e8f7a6-b5c4-3d2e-1f0a-9b8c7d6e5f4a',
          analisadoEm: '2026-05-10T14:22:00.000Z',
          createdAt: '2026-05-08T09:10:00.000Z',
          updatedAt: '2026-05-10T14:22:00.000Z',
        },
      ],
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
