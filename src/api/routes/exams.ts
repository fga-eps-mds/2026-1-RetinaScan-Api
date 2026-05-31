import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { createExam } from './exams/create-exam';
import { uploadExamImages } from './exams/upload-exam-images';
import { listExams } from './exams/list-exams';
import { getExamDetails } from './exams/get-exam-details';
import { registerExamWebhook } from './exams/register-exam-webhook';
import { registerExamErrorWebhook } from './exams/register-exam-error-webhook';
import {
  createExamSchema,
  uploadExamImagesSchema,
  listExamsSchema,
  getExamDetailsSchema,
  registerExamWebhookSchema,
  registerExamErrorWebhookSchema,
} from '../docs/exams';

// eslint-disable-next-line @typescript-eslint/require-await
export async function examRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/exams',
    {
      schema: createExamSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    createExam,
  );

  app.post<{ Params: { examId: string } }>(
    '/exams/:examId/images',
    {
      schema: uploadExamImagesSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    uploadExamImages,
  );

  app.get(
    '/exams',
    {
      schema: listExamsSchema,
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
      schema: getExamDetailsSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ADMIN]),
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
