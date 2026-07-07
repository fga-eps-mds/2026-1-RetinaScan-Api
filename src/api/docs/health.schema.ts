import type { FastifySchema } from 'fastify';

// Estrutura padrão da resposta de verificação de saúde da API e seus serviços dependentes.
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
  tags: ['Health'],
  summary: 'Health check',
  description: 'Informa o status da saúde da API e de suas dependências.',
  response: {
    200: {
      ...healthResponseSchema,
      // Exemplo de resposta quando a API e suas dependências estão funcionando.
      examples: [
        {
          status: 'healthy',
          services: { database: { ok: true, ms: 4 } },
        },
      ],
    },
    500: {
      ...healthResponseSchema,
      // Exemplo de resposta quando alguma dependência da API apresenta falha.
      examples: [
        {
          status: 'unhealthy',
          services: { database: { ok: false, ms: 0 } },
        },
      ],
    },
  },
};
