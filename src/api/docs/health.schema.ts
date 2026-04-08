import { FastifySchema } from 'fastify';

const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    services: {
      type: 'object',
      properties: {
        database: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            ms: { type: 'number' },
          },
          required: ['ok', 'ms'],
        },
      },
      required: ['database'],
    },
  },
} as const;

export const healthSchema: FastifySchema = {
  tags: ['health'],
  summary: 'Health check',
  description: 'Informa o status da saúde da API e de suas dependências.',
  response: {
    200: {
      ...healthResponseSchema,
      examples: [
        {
          status: 'healthy',
          services: { database: { ok: true, ms: 4 } },
        },
      ],
    },
    500: {
      ...healthResponseSchema,
      examples: [
        {
          status: 'unhealthy',
          services: { database: { ok: false, ms: 0 } },
        },
      ],
    },
  },
};