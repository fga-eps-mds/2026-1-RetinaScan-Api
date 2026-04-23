import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { tiposPerfil } from '@/modules/users/domain';
import { createExam } from './exams/create-exam';

export async function examRoutes(app: FastifyInstance): Promise<void> {
    app.post(
    '/exams',
    { preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])] },
    createExam,
  );
}