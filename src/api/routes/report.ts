import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { createSpecialistReport } from './report/create-specialist-report';
import { updateSpecialistReport } from './report/update-specialist-report';
import { acquireReportLock } from './report/acquire-report-lock';
import { releaseReportLock } from './report/release-report-lock';
import {
  createSpecialistReportSchema,
  updateSpecialistReportSchema,
} from '../docs/report/report.schema';
import { getExamEditingLocks } from './report/get-exams-report-locks';
import { heartbeatReportLock } from './report/heart-beart-report-lock';
import { generatePdfReport } from './report/generate-pdf-report';
import { generatePdfReportSchema } from '../docs/report/generate-pdf-report.schema';

// Registra as rotas relacionadas ao fluxo de criação, edição e consulta de laudos de especialistas.
// eslint-disable-next-line @typescript-eslint/require-await
export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.route({
    method: 'GET',
    url: '/report/editing-locks',
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ESPECIALISTA])],
    handler: getExamEditingLocks,
  });

  app.route({
    method: 'POST',
    url: '/report/:examId/lock',
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ESPECIALISTA])],
    handler: acquireReportLock,
  });

  app.route({
    method: 'PUT',
    url: '/report/:examId/lock/heartbeat',
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ESPECIALISTA])],
    handler: heartbeatReportLock,
  });

  app.route({
    method: 'DELETE',
    url: '/report/:examId/lock',
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ESPECIALISTA])],
    handler: releaseReportLock,
  });

  // Criação de laudo com registro automático das informações de auditoria.
  app.route({
    method: 'POST',
    url: '/report/:examId/create',
    schema: createSpecialistReportSchema,
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ESPECIALISTA])],
    config: {
      audit: {
        enabled: true,
        action: 'CREATE',
        category: 'SPECIALIST_REPORT',
        getDescription: (request) => {
          const params = request.params as { examId: string };
          return `Usuário ${request.user?.id} criou um laudo de especialista para o exame ${params.examId}`;
        },
        getTarget: (request) => ({
          targetEntityType: 'SPECIALIST_REPORT',
          targetEntityId: null,
          targetDisplay: `Laudo de especialista para exame ${(request.params as { examId: string }).examId}`,
        }),
        getChanges: (request) => {
          const body = request.body as Record<string, unknown>;
          return { texto: body.texto, resultadoIaValido: body.resultadoIaValido };
        },
        getMetadata: () => ({ source: 'reportRoutes.createSpecialistReport' }),
      },
    },
    handler: createSpecialistReport,
  });

  // Atualização de laudo com auditoria das alterações realizadas.
  app.route({
    method: 'PUT',
    url: '/report/:examId/update',
    schema: updateSpecialistReportSchema,
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ESPECIALISTA])],
    config: {
      audit: {
        enabled: true,
        action: 'UPDATE',
        category: 'SPECIALIST_REPORT',
        getDescription: (request) => {
          const params = request.params as { examId: string };
          return `Usuário ${request.user?.id} atualizou um laudo de especialista para o exame ${params.examId}`;
        },
        getTarget: (request) => ({
          targetEntityType: 'SPECIALIST_REPORT',
          targetEntityId: null,
          targetDisplay: `Laudo de especialista para exame ${(request.params as { examId: string }).examId}`,
        }),
        getChanges: (request) => {
          const body = request.body as Record<string, unknown>;
          return { texto: body.texto, resultadoIaValido: body.resultadoIaValido };
        },
        getMetadata: () => ({ source: 'reportRoutes.updateSpecialistReport' }),
      },
    },
    handler: updateSpecialistReport,
  });

  app.route({
    method: 'GET',
    url: '/report/:examId/pdf',
    schema: generatePdfReportSchema,
    preHandler: [
      authenticationMiddleware,
      authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ADMIN, tiposPerfil.ESPECIALISTA]),
    ],
    handler: generatePdfReport,
  });
}
