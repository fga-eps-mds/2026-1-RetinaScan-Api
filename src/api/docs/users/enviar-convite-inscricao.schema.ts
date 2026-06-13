import type { FastifySchema } from 'fastify';
import {
  conflictResponse,
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const enviarConviteInscricaoSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Envia convite de pré-inscrição para médico',
  description: 'Envia um convite por e-mail para que o médico complete o cadastro usando um token expirável.',
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email' },
      tipoPerfil: { type: 'string', enum: ['MEDICO', 'ESPECIALISTA'] },
    },
    required: ['email'],
  },
  response: {
    201: {
      type: 'object',
      additionalProperties: false,
      properties: {
        message: { type: 'string' },
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    409: conflictResponse,
    500: internalErrorResponse,
  },
};
