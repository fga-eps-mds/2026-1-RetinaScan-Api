import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { createExam } from './exams/create-exam';
import { uploadExamImages } from './exams/upload-exam-images';
import { listExams } from './exams/list-exams';
import { getExamDetails } from './exams/get-exam-details';
import { registerExamWebhook } from './exams/register-exam-webhook';
import { registerExamErrorWebhook } from './exams/register-exam-error-webhook';

// eslint-disable-next-line @typescript-eslint/require-await
export async function examRoutes(app: FastifyInstance): Promise<void> {
  app.route({
    method: 'POST',
    url: '/exams',
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

  app.route({
    method: 'POST',
    url: '/exams/:examId/images',
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    config: {
      audit: {
        enabled: true,
        action: 'UPLOAD_IMAGES',
        category: 'EXAM',
        getDescription: (request) =>
          `Usuário ${request.user?.id} enviou imagens para o exame ${(request.params as { examId: string }).examId}`,
        getTarget: (request) => {
          const { examId } = request.params as { examId: string };

          return {
            targetEntityType: 'EXAM',
            targetEntityId: examId,
            targetDisplay: examId,
          };
        },
        getChanges: (_request, payload) => {
          const response = payload as Record<string, unknown> | undefined;

          return {
            result: response ?? null,
          };
        },
        getMetadata: (request) => {
          const { examId } = request.params as { examId: string };

          return {
            source: 'examRoutes.uploadExamImages',
            examId,
          };
        },
      },
    },
    handler: uploadExamImages,
  });

  app.get(
    '/exams',
    {
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ADMIN]),
      ],
    },
    listExams,
  );

  app.get<{ Params: { examId: string } }>(
    '/exams/:examId',
    {
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ADMIN]),
      ],
    },
    getExamDetails,
  );

  app.post<{ Params: { examId: string } }>('/exams/:examId/webhook', registerExamWebhook);

  app.post<{ Params: { examId: string } }>(
    '/exams/:examId/webhook/error',
    registerExamErrorWebhook,
  );
}
