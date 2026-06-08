import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  legacyErrorResponse,
  unauthorizedResponse,
} from '../shared/error-responses';

export const searchMedicosSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Pesquisa médicos criados pelo admin',
  description:
    'Pesquisa paginada de médicos criados pelo administrador autenticado, com filtros por nome, CRM e email.',
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      nome: { type: 'string' },
      crm: { type: 'string' },
      email: { type: 'string', format: 'email' },
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      tipoPerfil: { type: 'string', enum: ['MEDICO', 'ESPECIALISTA'] },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
      description: 'Página de médicos.',
      example: {
        message: 'Médicos encontrados com sucesso.',
        data: [
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
            id: 'e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6071',
            nomeCompleto: 'Dr. Bruno Costa',
            cpf: '390.533.447-05',
            dtNascimento: '1979-02-14',
            crm: 'CRM/SP 54321',
            email: 'bruno.costa@retinascan.dev',
            tipoPerfil: 'MEDICO',
            status: 'ATIVO',
            image: null,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
        },
      },
    },
    400: legacyErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
