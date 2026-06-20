import type { FastifySchema } from 'fastify';
import {
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '../shared/error-responses';

export const getExamMetricsSchema: FastifySchema = {
  tags: ['Exames'],
  summary: 'Métricas agregadas de exames',
  description:
    'Retorna métricas agregadas de volume/status dos exames e da distribuição de diagnósticos da IA. Acesso restrito a administradores. Filtro de período opcional sobre a data/hora do exame.',
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Início do período (inclusive).',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'Fim do período (inclusive).',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
      description: 'Métricas agregadas de exames.',
      example: {
        volume: {
          total: 1280,
          porStatus: { CRIADO: 40, EM_PROCESSAMENTO: 12, CONCLUIDO: 1200, ERRO_PROCESSAMENTO: 28 },
          serieTemporal: [
            { data: '2026-06-01', total: 35 },
            { data: '2026-06-02', total: 41 },
          ],
        },
        resultadosIa: {
          totalResultados: 2150,
          porDiagnostico: [
            { label: 'normal', total: 1500 },
            { label: 'abnormal', total: 650 },
          ],
          confiancaMedia: 0.87,
        },
      },
    },
    400: validationErrorResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: internalErrorResponse,
  },
};
