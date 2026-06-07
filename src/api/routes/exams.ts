import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { createExam } from './exams/create-exam';
import { processExamUpload } from './exams/process-exam-upload';
import { listExams } from './exams/list-exams';
import { getExamDetails } from './exams/get-exam-details';
import { registerExamWebhook } from './exams/register-exam-webhook';
import { registerExamErrorWebhook } from './exams/register-exam-error-webhook';
import {
  createExamSchema,
  processExamUploadSchema,
  listExamsSchema,
  getExamDetailsSchema,
  registerExamWebhookSchema,
  registerExamErrorWebhookSchema,
} from '../docs/exams';

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
}
