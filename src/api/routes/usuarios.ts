import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { updateUserRoute } from './users/update-user-route';
import { updateUserImageRoute } from './users/update-user-image-route';
import { tiposPerfil } from '@/modules/users/domain';
import { createUserByAdmin } from './users/create-user-by-admin';
import { getAllUsers } from './users/get-all-users';

// eslint-disable-next-line @typescript-eslint/require-await
export async function usuarioRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/usuarios',
    { preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])] },
    createUserByAdmin,
  );

  app.get(
    '/usuarios',
    { preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])] },
    getAllUsers,
  );

  app.put(
    '/usuarios',
    {
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    updateUserRoute,
  );

  app.patch(
    '/usuarios/imagem',
    {
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    updateUserImageRoute,
  );
}
