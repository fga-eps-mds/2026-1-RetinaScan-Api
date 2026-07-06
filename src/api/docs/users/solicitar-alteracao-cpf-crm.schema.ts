import type { FastifySchema } from 'fastify';
import {
  conflictResponse,
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

// Documentação da rota responsável por criar solicitações de alteração de CPF e/ou CRM.
export const solicitarAlteracaoCpfCrmSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Solicita alteração de CPF e/ou CRM',
  description:
    'Cria uma solicitação que deverá ser aprovada por um administrador. Informe ao menos `cpfNovo` ou `crmNovo`.',
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      cpfNovo: { type: 'string', description: 'Novo CPF (válido).' },
      crmNovo: { type: 'string', minLength: 1 },
    },
  },
  response: {
    201: {
      type: 'object',
      additionalProperties: true,
      description: 'Solicitação criada.',
      // Exemplo da resposta retornada após o envio da solicitação.
      example: {
        idSolicitacao: 'b8c1f3e2-5a7d-4e1b-9c2f-1a2b3c4d5e6f',
        status: 'PENDENTE',
        mensagem:
          'Solicitação de alteração de CPF/CRM enviada com sucesso. Aguarde a análise do administrador.',
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    409: conflictResponse,
    500: internalErrorResponse,
  },
};
