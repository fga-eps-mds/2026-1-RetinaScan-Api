import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const updateUserSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Atualiza o próprio usuário',
  description:
    'Permite que o médico autenticado atualize seus próprios dados. `senhaAtual` e `novaSenha` devem ser enviadas juntas.',
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      nomeCompleto: { type: 'string', minLength: 3 },
      email: { type: 'string', format: 'email' },
      dtNascimento: { type: 'string', format: 'date' },
      senhaAtual: { type: 'string', minLength: 6 },
      novaSenha: { type: 'string', minLength: 6 },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
      description: 'Usuário atualizado.',
      example: {
        usuario: {
          id: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
          nomeCompleto: 'Dra. Ana Pereira Silva',
          cpf: '529.982.247-25',
          dtNascimento: '1985-09-30',
          crm: 'CRM/DF 12345',
          email: 'ana.silva@retinascan.dev',
          tipoPerfil: 'MEDICO',
          status: 'ATIVO',
          image: 'https://minio.local/retinascan/users/7c2c7f2e.../profile.png',
        },
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
