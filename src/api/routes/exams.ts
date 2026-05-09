import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { createExam } from './exams/create-exam';
import { uploadExamImages } from './exams/upload-exam-images';
import { getExamsByCpf } from './exams/get-exams-by-cpf';

// eslint-disable-next-line @typescript-eslint/require-await
export async function examRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/exams',
    { preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])] },
    createExam,
  );

  app.post<{ Params: { examId: string } }>(
    '/exams/:examId/images',
    { preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])] },
    uploadExamImages,
  );

  app.get<{ Querystring: { cpf: string } }>(
    '/exams',
    { preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])] },
    getExamsByCpf,
  );
}
