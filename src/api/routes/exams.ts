import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { createExam } from './exams/create-exam';
import { processExamUpload } from './exams/process-exam-upload';
import { listExams } from './exams/list-exams';
import { getExamDetails } from './exams/get-exam-details';
import { registerExamWebhook } from './exams/register-exam-webhook';
import { registerExamErrorWebhook } from './exams/register-exam-error-webhook';
import { getExamMetrics } from './exams/get-exam-metrics';
import {
  createExamSchema,
  processExamUploadSchema,
  listExamsSchema,
  getExamDetailsSchema,
  registerExamWebhookSchema,
  registerExamErrorWebhookSchema,
  shareExamSchema,
  listExamSharesSchema,
  listMySharesSchema,
  revokeExamShareSchema,
  getExamMetricsSchema,
} from '../docs/exams';
import { shareExam } from './exams/share-exam';
import { listExamShares } from './exams/list-exam-shares';
import { listMyShares } from './exams/list-my-shares';
import { revokeExamShare } from './exams/revoke-exam-share';

// eslint-disable-next-line @typescript-eslint/require-await
export async function examRoutes(app: FastifyInstance): Promise<void> {
  app.route({
    method: 'POST',
    url: '/exams',
    schema: createExamSchema,
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    config: {
      audit: {
        enabled: true,
        action: 'CREATE',
        category: 'EXAM',
        getDescription: (request) => `Usuário ${request.user?.id} criou um novo exame`,
        getTarget: (_request, payload) => {
          const exam = payload as { id?: string } | undefined;

          return {
            targetEntityType: 'EXAM',
            targetEntityId: exam?.id ?? null,
            targetDisplay: exam?.id ?? null,
          };
        },
        getChanges: (request) => {
          const body = request.body as Record<string, unknown>;

          return {
            nomeCompleto: body.nomeCompleto,
            cpf: body.cpf,
            sexo: body.sexo,
            dtNascimento: body.dtNascimento,
            dtHora: body.dtHora,
            descricao: body.descricao,
          };
        },
        getMetadata: () => ({
          source: 'examRoutes.createExam',
        }),
      },
    },
    handler: createExam,
  });

  app.post(
    '/exams/images',
    {
      schema: processExamUploadSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    processExamUpload,
  );

  app.get(
    '/exams',
    {
      schema: listExamsSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ADMIN, tiposPerfil.ESPECIALISTA]),
      ],
    },
    listExams,
  );

  app.get(
    '/exams/metrics',
    {
      schema: getExamMetricsSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.ADMIN, tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
      ],
    },
    getExamMetrics,
  );

  app.get<{ Params: { examId: string } }>(
    '/exams/:examId',
    {
      schema: getExamDetailsSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ADMIN, tiposPerfil.ESPECIALISTA]),
      ],
    },
    getExamDetails,
  );

  app.post<{ Params: { examId: string } }>(
    '/exams/:examId/webhook',
    { schema: registerExamWebhookSchema },
    registerExamWebhook,
  );

  app.post<{ Params: { examId: string } }>(
    '/exams/:examId/webhook/error',
    { schema: registerExamErrorWebhookSchema },
    registerExamErrorWebhook,
  );

  app.post<{ Params: { examId: string } }>(
    '/exams/:examId/share',
    {
      schema: shareExamSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA, tiposPerfil.ADMIN]),
      ],
      config: {
        audit: {
          enabled: true,
          action: 'SHARE_CREATED',
          category: 'EXAM_ACCESS',
          getDescription: (request) => {
            const body = request.body as { emailDestino?: string };
            return `Acesso ao exame concedido para ${body.emailDestino || 'o médico destino'}`;
          },
          getTarget: (request) => ({
            targetEntityType: 'EXAM',
            targetEntityId: (request.params as { examId: string }).examId,
            targetDisplay: `Exame de ID: ${(request.params as { examId: string }).examId}`,
          }),
        },
      },
    },
    shareExam,
  );

  app.get<{ Params: { examId: string } }>(
    '/exams/:examId/shares',
    {
      schema: listExamSharesSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA, tiposPerfil.ADMIN]),
      ],
    },
    listExamShares,
  );

  app.get(
    '/exams/shares/my-shares',
    {
      schema: listMySharesSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
      ],
    },
    listMyShares,
  );

  app.delete<{ Params: { examId: string; shareId: string } }>(
    '/exams/:examId/shares/:shareId',
    {
      schema: revokeExamShareSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA, tiposPerfil.ADMIN]),
      ],
      config: {
        audit: {
          enabled: true,
          action: 'SHARE_REVOKED',
          category: 'EXAM_ACCESS',
          getDescription: (request, payload: any) => {
            const emailDestino = payload?.data?.medicoDestinoEmail || 'o médico selecionado';
            return `Acesso ao exame revogado para ${emailDestino}`;
          },
          getTarget: (request) => {
            const params = request.params as { examId: string; shareId: string };
            return {
              targetEntityType: 'EXAM',
              targetEntityId: params.examId,
              targetDisplay: `Exame de ID: ${params.examId}`,
            };
          },
        },
      },
    },
    revokeExamShare,
  );
}
