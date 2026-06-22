import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const deletarSolicitacaoCpfCrmAdminSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Apaga uma solicitação de alteração',
  description: 'Apaga uma solicitação de alteração de CPF/CRM pelo identificador.',
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['idSolicitacao'],
    properties: {
      idSolicitacao: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
  response: {
    204: {
      type: 'null',
      description: 'Solicitação apagada com sucesso.',
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
