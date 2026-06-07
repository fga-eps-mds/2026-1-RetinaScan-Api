import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  legacyErrorResponse,
  unauthorizedResponse,
} from '../shared/error-responses';

export const createUserByAdminSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Cria um usuário (admin)',
  description: 'Cria um novo médico ou admin. Apenas administradores podem chamar.',
  body: {
    type: 'object',
    required: ['nomeCompleto', 'email', 'cpf', 'crm', 'dtNascimento', 'senha', 'tipoPerfil'],
    properties: {
      nomeCompleto: { type: 'string', minLength: 3 },
      email: { type: 'string', format: 'email' },
      cpf: { type: 'string', description: 'CPF válido.' },
      crm: { type: 'string', minLength: 1 },
      dtNascimento: { type: 'string', format: 'date' },
      senha: { type: 'string', minLength: 6 },
      tipoPerfil: { type: 'string', enum: ['ADMIN', 'MEDICO', 'ESPECIALISTA'] },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
      examples: [{ message: 'Usuário criado com sucesso.' }],
    },
    400: legacyErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    409: legacyErrorResponse,
    500: internalErrorResponse,
  },
};
