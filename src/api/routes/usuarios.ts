import type { FastifyInstance } from 'fastify';
import { authenticationMiddleware, authorizationMiddleware } from '../middlewares';
import { updateUserRoute } from './users/update-user-route';
import { updateUserImageRoute } from './users/update-user-image-route';
import { tiposPerfil } from '@/modules/users/domain';
import { createUserByAdmin } from './users/create-user-by-admin';
import { getAllUsers } from './users/get-all-users';
import { solicitarAlteracaoCpfCrmRoute } from './users/solicitar-alteracao-cpf-crm';
import { aprovarSolicitacaoCpfCrmRoute } from './users/aprovar-solicitacao-cpf-crm';
import { rejeitarSolicitacaoCpfCrmRoute } from './users/rejeitar-solicitacao-cpf-crm';
import { listarSolicitacoesCpfCrmAdminRoute } from './users/listar-solicitacoes-cpf-crm-admin';
import { listarMinhasSolicitacoesCpfCrmRoute } from './users/listar-minhas-solicitacoes-cpf-crm';
import { searchMedicosByAdmin } from './users/seach-users-created-by-admin';
import {
  createUserByAdminSchema,
  getAllUsersSchema,
  updateUserSchema,
  updateUserImageSchema,
  solicitarAlteracaoCpfCrmSchema,
  aprovarSolicitacaoCpfCrmSchema,
  rejeitarSolicitacaoCpfCrmSchema,
  listarSolicitacoesCpfCrmAdminSchema,
  listarMinhasSolicitacoesCpfCrmSchema,
  searchMedicosSchema,
} from '../docs/users';

// eslint-disable-next-line @typescript-eslint/require-await
export async function usuarioRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/usuarios',
    {
      schema: createUserByAdminSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    },
    createUserByAdmin,
  );

  app.get(
    '/usuarios',
    {
      schema: getAllUsersSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    },
    getAllUsers,
  );

  app.put(
    '/usuarios',
    {
      schema: updateUserSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    updateUserRoute,
  );

  app.patch(
    '/usuarios/imagem',
    {
      schema: updateUserImageSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    updateUserImageRoute,
  );

  app.post(
    '/usuarios/solicitacoes-cpf-crm',
    {
      schema: solicitarAlteracaoCpfCrmSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    solicitarAlteracaoCpfCrmRoute,
  );

  app.patch(
    '/usuarios/solicitacoes-cpf-crm/:id/aprovar',
    {
      schema: aprovarSolicitacaoCpfCrmSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    },
    aprovarSolicitacaoCpfCrmRoute,
  );

  app.patch(
    '/usuarios/solicitacoes-cpf-crm/:id/rejeitar',
    {
      schema: rejeitarSolicitacaoCpfCrmSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    },
    rejeitarSolicitacaoCpfCrmRoute,
  );

  app.get(
    '/usuarios/solicitacoes-cpf-crm',
    {
      schema: listarSolicitacoesCpfCrmAdminSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    },
    listarSolicitacoesCpfCrmAdminRoute,
  );

  app.get(
    '/usuarios/minhas-solicitacoes-cpf-crm',
    {
      schema: listarMinhasSolicitacoesCpfCrmSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.MEDICO])],
    },
    listarMinhasSolicitacoesCpfCrmRoute,
  );

  app.get(
    '/medicos/search',
    {
      schema: searchMedicosSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    },
    searchMedicosByAdmin,
  );
}
