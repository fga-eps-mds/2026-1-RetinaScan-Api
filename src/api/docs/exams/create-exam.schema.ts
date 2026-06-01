import type { FastifySchema } from 'fastify';
import {
  conflictResponse,
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

const comorbidadesSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    diabetes: { type: 'boolean', default: false },
    diabetesAnos: { type: 'integer', minimum: 0 },
    diabetesUsoInsulina: { type: 'boolean', default: false },
    diabetesControlado: { type: 'boolean', default: false },
    hipertensao: { type: 'boolean', default: false },
    hipertensaoControlada: { type: 'boolean', default: false },
    altaMiopia: { type: 'boolean', default: false },
    glaucoma: { type: 'boolean', default: false },
    usoHidroxicloroquina: { type: 'boolean', default: false },
    uveite: { type: 'boolean', default: false },
    catarata: { type: 'boolean', default: false },
    outrasComorbidades: { type: 'boolean', default: false },
    outrasComorbidadesDescricao: { type: 'string', minLength: 1 },
    qualidadeTecnicaDificuldade: { type: 'boolean', default: false },
  },
} as const;

const createExamBody = {
  type: 'object',
  additionalProperties: false,
  required: ['nomeCompleto', 'cpf', 'sexo', 'dtNascimento', 'dtHora', 'comorbidades'],
  properties: {
    nomeCompleto: { type: 'string', minLength: 1 },
    cpf: { type: 'string', description: 'CPF válido (com ou sem máscara).' },
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
    comorbidades: comorbidadesSchema,
    descricao: { type: 'string', minLength: 1 },
  },
} as const;

const createExamResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
  additionalProperties: true,
  example: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    idUsuario: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
    nomeCompleto: 'João da Silva',
    cpf: '529.982.247-25',
    sexo: 'MASCULINO',
    dtNascimento: 'enc:v1:9f1c2a...',
    dtHora: '2026-05-25T14:30:00.000Z',
    status: 'CRIADO',
    descricao: 'enc:v1:a7b9c1...',
  },
} as const;

export const createExamSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Cria um exame',
  description:
    'Cria um exame vinculado ao médico autenticado, com dados do paciente e comorbidades.',
  body: createExamBody,
  response: {
    201: createExamResponse,
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    409: conflictResponse,
    500: internalErrorResponse,
  },
};
