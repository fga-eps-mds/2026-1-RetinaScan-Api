// Estrutura base reutilizada pelas respostas de erro da API.
export const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['error', 'message'],
} as const;

// Estrutura de resposta utilizada para erros de validação de entrada.
export const validationErrorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string', example: 'ValidationError' },
    message: { type: 'string' },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'array', items: { type: 'string' } },
          message: { type: 'string' },
        },
      },
    },
  },
  required: ['error', 'message'],
} as const;

export const unauthorizedResponse = {
  ...errorResponse,
  examples: [{ error: 'UnauthorizedError', message: 'Não autenticado.' }],
} as const;

export const forbiddenResponse = {
  ...errorResponse,
  examples: [{ error: 'UnauthorizedError', message: 'Acesso negado.' }],
} as const;

export const notFoundResponse = {
  ...errorResponse,
  examples: [{ error: 'NotFoundError', message: 'Recurso não encontrado.' }],
} as const;

export const conflictResponse = {
  ...errorResponse,
  examples: [{ error: 'ConflictError', message: 'Conflito de dados.' }],
} as const;

export const internalErrorResponse = {
  ...errorResponse,
  examples: [{ error: 'InternalServerError', message: 'An unexpected error occurred' }],
} as const;

// Estrutura de erro mantida por compatibilidade com endpoints legados.
export const legacyErrorResponse = {
  type: 'object',
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
    errors: {
      type: 'object',
      additionalProperties: { type: 'array', items: { type: 'string' } },
    },
  },
  required: ['statusCode', 'error', 'message'],
} as const;
