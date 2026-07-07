import type { FastifySchema } from 'fastify';

// Documentação da rota responsável por listar médicos disponíveis para compartilhamento.
export const listAvailableDoctorsSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Lista médicos disponíveis para compartilhamento',
  description:
    'Retorna uma lista resumida (apenas id, nome e email) de todos os médicos e especialistas da plataforma, para o front-end exibir na busca. Pode-se passar um parâmetro de busca opcional.',
  querystring: {
    type: 'object',
    properties: {
      busca: {
        type: 'string',
        description: 'Texto para buscar no nome ou email do médico.',
      },
    },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nomeCompleto: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
    400: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        error: { type: 'string' },
        message: { type: 'string' },
        errors: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    401: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    500: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};
