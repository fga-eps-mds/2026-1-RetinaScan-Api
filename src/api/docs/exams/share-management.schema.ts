import type { FastifySchema } from 'fastify';

// Documentação da rota que lista os compartilhamentos ativos de um exame.
export const listExamSharesSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Lista compartilhamentos ativos de um exame',
  description:
    'Retorna a lista de médicos com os quais este exame foi compartilhado e que ainda possuem acesso ativo.',
  params: {
    type: 'object',
    properties: {
      examId: { type: 'string', format: 'uuid' },
    },
    required: ['examId'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              medicoDestino: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  nomeCompleto: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              criadoEm: { type: 'string', format: 'date-time' },
              expiraEm: { type: 'string', format: 'date-time', nullable: true },
              ativo: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
};

// Documentação da rota que lista todos os compartilhamentos criados pelo usuário autenticado.
export const listMySharesSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Lista todos os compartilhamentos criados pelo usuário logado',
  description:
    'Retorna uma lista de todos os compartilhamentos ativos que o médico autenticado criou na plataforma.',
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              examId: { type: 'string' },
              medicoDestino: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  nomeCompleto: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              criadoEm: { type: 'string', format: 'date-time' },
              expiraEm: { type: 'string', format: 'date-time', nullable: true },
              ativo: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
};

// Documentação da rota responsável por revogar um compartilhamento de exame.
export const revokeExamShareSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Revoga o compartilhamento de um exame',
  description:
    'Permite que o criador do exame (ou um admin/especialista) revogue imediatamente o acesso concedido a outro médico.',
  params: {
    type: 'object',
    properties: {
      examId: { type: 'string', format: 'uuid' },
      shareId: { type: 'string', format: 'uuid' },
    },
    required: ['examId', 'shareId'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
};
