import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

// Documentação da rota responsável pelo processamento das imagens enviadas para um exame.
export const processExamUploadSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Processa upload de imagens de fundo de olho',
  description:
    'Recebe de 1 a 2 arquivos de imagem (`olhoDireito` e/ou `olhoEsquerdo`) via `multipart/form-data`. ' +
    'Aceita `image/jpeg`, `image/png` ou DICOM; arquivos DICOM têm metadados extraídos e o pixel convertido para JPEG. ' +
    'As imagens são armazenadas em área temporária e referenciadas por `uploadId` para posterior criação do exame.',
  consumes: ['multipart/form-data'],
  body: {
    type: 'object',
    properties: {
      olhoDireito: { type: 'string', format: 'binary' },
      olhoEsquerdo: { type: 'string', format: 'binary' },
    },
  },
  response: {
    201: {
      type: 'object',
      additionalProperties: true,
      description:
        'Metadados consolidados (quando houver DICOM) e referências das imagens processadas.',
      required: ['imagens'],
      properties: {
        // Dados extraídos automaticamente do arquivo DICOM, quando disponíveis.
        metadados: {
          type: 'object',
          additionalProperties: false,
          properties: {
            nomeCompleto: { type: 'string' },
            sexo: { type: 'string', enum: ['MASCULINO', 'FEMININO', 'OUTRO'] },
            dtNascimento: {
              type: 'string',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$',
              description: 'Data de nascimento no formato AAAA-MM-DD.',
            },
            dtHora: {
              type: 'string',
              format: 'date-time',
              description: 'Data/hora ISO 8601 do exame.',
            },
            descricao: { type: 'string' },
          },
        },
        imagens: {
          type: 'array',
          minItems: 1,
          maxItems: 2,
          items: {
            type: 'object',
            required: ['uploadId', 'urlPreview'],
            properties: {
              uploadId: { type: 'string', format: 'uuid' },
              urlPreview: { type: 'string' },
              lateralidade: { type: 'string', enum: ['OD', 'OE'] },
            },
          },
        },
      },
      // Exemplo da resposta retornada após o processamento das imagens.
      example: {
        metadados: {
          nomeCompleto: 'João da Silva',
          sexo: 'MASCULINO',
          dtNascimento: '1980-05-20',
          dtHora: '2026-05-25T14:30:00.000Z',
          descricao: 'Retinografia colorida',
        },
        imagens: [
          {
            uploadId: '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
            urlPreview: 'https://minio.local/exam-images/pending/abc.jpg?X-Amz-...',
            lateralidade: 'OD',
          },
          {
            uploadId: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
            urlPreview: 'https://minio.local/exam-images/pending/def.jpg?X-Amz-...',
            lateralidade: 'OE',
          },
        ],
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
