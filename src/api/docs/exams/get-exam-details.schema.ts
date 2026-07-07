import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

// Documentação da rota responsável por retornar os detalhes completos de um exame.
export const getExamDetailsSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Detalhes de um exame',
  description: 'Retorna detalhes completos do exame, incluindo imagens e resultados da IA.',
  params: {
    type: 'object',
    required: ['examId'],
    properties: {
      examId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
      description: 'Exame com paciente, comorbidades, imagens e (quando houver) resultado da IA.',
      // Exemplo utilizado pelo Swagger para ilustrar a estrutura da resposta.
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'CONCLUIDO',
        nomeCompleto: 'João da Silva',
        cpf: '529.982.247-25',
        sexo: 'MASCULINO',
        dtNascimento: '1980-04-12',
        dtHora: '2026-05-25T14:30:00.000Z',
        olho: 'AO',
        descricao: 'Paciente acompanhado há 3 anos.',
        medico: {
          id: '7c2c7f2e-1d3a-4f0a-8e6d-b6a3a5f0c111',
          nomeCompleto: 'Dra. Ana Pereira',
        },
        comorbidades: {
          diabetes: true,
          diabetesAnos: 8,
          diabetesUsoInsulina: false,
          diabetesControlado: true,
          hipertensao: true,
          hipertensaoControlada: true,
          altaMiopia: false,
          glaucoma: false,
          usoHidroxicloroquina: false,
          uveite: false,
          catarata: false,
          outrasComorbidades: false,
          outrasComorbidadesDescricao: null,
          qualidadeTecnicaDificuldade: false,
        },
        imagens: [
          {
            id: '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
            lateralidadeOlho: 'OD',
            url: 'https://minio.local/retinascan/exams/123e4567.../OD-9a8b7c6d.jpg?X-Amz-Signature=...',
            qualidadeImg: 'BOA',
            resultadoIa: {
              id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
              predictedClass: 0,
              predictedLabel: 'No DR',
              confidence: 0.94,
              probabilities: {
                'No DR': 0.94,
                Mild: 0.04,
                Moderate: 0.015,
                Severe: 0.003,
                'Proliferative DR': 0.002,
              },
            },
          },
          {
            id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
            lateralidadeOlho: 'OE',
            url: 'https://minio.local/retinascan/exams/123e4567.../OE-aa11bb22.jpg?X-Amz-Signature=...',
            qualidadeImg: 'BOA',
            resultadoIa: {
              id: 'c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f',
              predictedClass: 1,
              predictedLabel: 'Mild',
              confidence: 0.81,
              probabilities: {
                'No DR': 0.12,
                Mild: 0.81,
                Moderate: 0.05,
                Severe: 0.015,
                'Proliferative DR': 0.005,
              },
            },
          },
        ],
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
    500: internalErrorResponse,
  },
};
