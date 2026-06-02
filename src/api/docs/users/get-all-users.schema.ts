import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
} from '../shared/error-responses';

export const getAllUsersSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Lista todos os usuários (admin)',
  description: 'Retorna a lista completa de usuários do sistema. Restrito a administradores.',
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
      },
      example: [
        {
          id: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
          nomeCompleto: 'Dra. Ana Pereira',
          cpf: '529.982.247-25',
          dtNascimento: '1985-09-30',
          crm: 'CRM/DF 12345',
          email: 'ana.pereira@retinascan.dev',
          tipoPerfil: 'MEDICO',
          status: 'ATIVO',
          image: 'https://minio.local/retinascan/users/7c2c7f2e.../profile.png',
        },
        {
          id: 'd9e8f7a6-b5c4-3d2e-1f0a-9b8c7d6e5f4a',
          nomeCompleto: 'Admin Retina',
          cpf: '111.444.777-35',
          dtNascimento: null,
          crm: null,
          email: 'admin@retinascan.dev',
          tipoPerfil: 'ADMIN',
          status: 'ATIVO',
          image: null,
        },
      ],
    },
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
