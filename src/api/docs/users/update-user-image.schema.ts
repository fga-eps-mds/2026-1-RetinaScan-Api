import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const updateUserImageSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Atualiza a imagem de perfil',
  description:
    'Upload da imagem de perfil do usuário autenticado. Aceita `image/png`, `image/jpeg`, `image/jpg`, `image/webp`. Envie como `multipart/form-data` no campo `image`.',
  consumes: ['multipart/form-data'],
  body: {
    type: 'object',
    properties: {
      image: { type: 'string', format: 'binary' },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', format: 'uri' },
      },
      example: {
        url: 'https://minio.local/retinascan/users/7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111/profile.png',
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
