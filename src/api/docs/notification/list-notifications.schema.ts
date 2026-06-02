import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const listNotificationsSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Lista notificações do usuário',
  description: 'Lista notificações do usuário autenticado, com filtros opcionais.',
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: {
        type: 'string',
        enum: ['todas', 'nao-lidas', 'lidas'],
        default: 'todas',
      },
      tipo: { type: 'string', minLength: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
  response: {
    200: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
      example: [
        {
          id: 'f1e2d3c4-b5a6-9788-ab12-cd34ef56ab78',
          usuarioId: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
          tipo: 'avaliacao_ia_atualizada',
          titulo: 'Avaliação da IA disponível',
          mensagem: 'O resultado da análise do exame está pronto para revisão.',
          dados: {
            examId: '123e4567-e89b-12d3-a456-426614174000',
          },
          chaveDedupe: 'avaliacao-ia:123e4567-e89b-12d3-a456-426614174000',
          lidaEm: null,
          enviadaEmTempoRealEm: '2026-05-25T14:31:02.000Z',
          enviadaPorEmailEm: null,
          createdAt: '2026-05-25T14:31:00.000Z',
          updatedAt: '2026-05-25T14:31:02.000Z',
        },
        {
          id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
          usuarioId: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
          tipo: 'status_solicitacao_cadastral_atualizado',
          titulo: 'Status da solicitação cadastral atualizado',
          mensagem: 'Sua solicitação de alteração de CPF/CRM foi APROVADA.',
          dados: {
            solicitacaoId: 'b8c1f3e2-5a7d-4e1b-9c2f-1a2b3c4d5e6f',
            status: 'APROVADA',
          },
          chaveDedupe: 'status-solicitacao-cadastral:b8c1f3e2-...:APROVADA',
          lidaEm: '2026-05-25T15:10:00.000Z',
          enviadaEmTempoRealEm: '2026-05-25T12:00:05.000Z',
          enviadaPorEmailEm: '2026-05-25T12:00:10.000Z',
          createdAt: '2026-05-25T12:00:00.000Z',
          updatedAt: '2026-05-25T15:10:00.000Z',
        },
      ],
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
