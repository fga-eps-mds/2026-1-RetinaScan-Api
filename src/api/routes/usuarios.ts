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
import { deletarSolicitacaoCpfCrmAdminRoute } from './users/deletar-solicitacao-cpf-crm';
import { deletarSolicitacaoCpfCrmAdminSchema } from '../docs/users/deletar-solicitacoes-cpf-crm.schema';

// eslint-disable-next-line @typescript-eslint/require-await
export async function usuarioRoutes(app: FastifyInstance): Promise<void> {
  app.route({
    method: 'POST',
    url: '/usuarios',
    schema: createUserByAdminSchema,
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    config: {
      audit: {
        enabled: true,
        action: 'CREATE',
        category: 'USER_MANAGEMENT',
        getDescription: (request) => `Admin ${request.user?.email} criou um novo usuário`,
        getTarget: (request) => {
          const body = request.body as Record<string, unknown>;

          return {
            targetEntityType: 'USER',
            targetEntityId: typeof body.email === 'string' ? body.email : null,
            targetDisplay: typeof body.email === 'string' ? body.email : null,
          };
        },
        getChanges: (request) => {
          const body = request.body as Record<string, unknown>;

          return {
            nomeCompleto: body.nomeCompleto,
            email: body.email,
            cpf: typeof body.cpf === 'string' ? `${body.cpf.slice(0, 3)}***` : body.cpf,
            crm: body.crm,
            dtNascimento: body.dtNascimento,
            tipoPerfil: body.tipoPerfil,
          };
        },
        getMetadata: () => ({
          source: 'usuarioRoutes.createUserByAdmin',
        }),
      },
    },
    handler: createUserByAdmin,
  });

  app.get(
    '/usuarios',
    {
      schema: getAllUsersSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    },
    getAllUsers,
  );

  app.route({
    method: 'PUT',
    url: '/usuarios',
    schema: updateUserSchema,
    preHandler: [
      authenticationMiddleware,
      authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
    ],
    config: {
      audit: {
        enabled: true,
        action: 'UPDATE',
        category: 'USER_MANAGEMENT',
        getDescription: (request) => `Usuário ${request.user?.id} atualizou seu perfil`,
        getTarget: (request) => ({
          targetEntityType: 'USER',
          targetEntityId: request.user?.id ?? null,
          targetDisplay: request.user?.email ?? null,
        }),
        getChanges: (_request, payload) => {
          const response = payload as
            | {
                usuario?: {
                  nomeCompleto?: string | null;
                  email?: string | null;
                  dtNascimento?: string | Date | null;
                };
              }
            | undefined;

          return {
            nomeCompleto: response?.usuario?.nomeCompleto ?? null,
            email: response?.usuario?.email ?? null,
            dtNascimento: response?.usuario?.dtNascimento ?? null,
          };
        },
        getMetadata: (request) => {
          const body = request.body as {
            senhaAtual?: string;
            novaSenha?: string;
          };

          return {
            source: 'usuarioRoutes.updateUserRoute',
            changedPassword: Boolean(body.senhaAtual && body.novaSenha),
          };
        },
      },
    },
    handler: updateUserRoute,
  });

  app.route({
    method: 'PATCH',
    url: '/usuarios/imagem',
    schema: updateUserImageSchema,
    preHandler: [
      authenticationMiddleware,
      authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
    ],
    config: {
      audit: {
        enabled: true,
        action: 'UPDATE_IMAGE',
        category: 'USER_MANAGEMENT',
        getDescription: (request) => `Usuário ${request.user?.id} atualizou sua imagem de perfil`,
        getTarget: (request) => ({
          targetEntityType: 'USER',
          targetEntityId: request.user?.id ?? null,
          targetDisplay: request.user?.email ?? request.user?.id ?? null,
        }),
        getChanges: (_request, payload) => {
          const response = payload as { url?: string } | undefined;

          return {
            imageUrl: response?.url ?? null,
          };
        },
        getMetadata: () => ({
          source: 'usuarioRoutes.updateUserImageRoute',
        }),
      },
    },
    handler: updateUserImageRoute,
  });

  app.route({
    method: 'POST',
    url: '/usuarios/solicitacoes-cpf-crm',
    schema: solicitarAlteracaoCpfCrmSchema,
    preHandler: [
      authenticationMiddleware,
      authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
    ],
    config: {
      audit: {
        enabled: true,
        action: 'REQUEST_CHANGE',
        category: 'USER_MANAGEMENT',
        getDescription: (request) => `Usuário ${request.user?.id} solicitou alteração de CPF/CRM`,
        getTarget: (request) => ({
          targetEntityType: 'USER',
          targetEntityId: request.user?.id ?? null,
          targetDisplay: request.user?.email ?? request.user?.id ?? null,
        }),
        getChanges: (request) => {
          const body = request.body as {
            cpfNovo?: string;
            crmNovo?: string;
          };

          return {
            cpfNovo: body.cpfNovo ? `${body.cpfNovo.slice(0, 3)}***` : null,
            crmNovo: body.crmNovo ?? null,
          };
        },
        getMetadata: (request) => {
          const body = request.body as {
            cpfNovo?: string;
            crmNovo?: string;
          };

          return {
            source: 'usuarioRoutes.solicitarAlteracaoCpfCrmRoute',
            requestedFields: [
              ...(body.cpfNovo ? ['cpfNovo'] : []),
              ...(body.crmNovo ? ['crmNovo'] : []),
            ],
          };
        },
      },
    },
    handler: solicitarAlteracaoCpfCrmRoute,
  });

  app.route({
    method: 'PATCH',
    url: '/usuarios/solicitacoes-cpf-crm/:id/aprovar',
    schema: aprovarSolicitacaoCpfCrmSchema,
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    config: {
      audit: {
        enabled: true,
        action: 'APPROVE',
        category: 'USER_MANAGEMENT',
        getDescription: (request, payload) => {
          const params = request.params as { id: string };
          const response = payload as { solicitacao?: unknown } | undefined;
          const isSuccess = Boolean(response?.solicitacao);

          return isSuccess
            ? `Solicitação de CPF/CRM ${params.id} aprovada por admin ${request.user?.email}`
            : `Falha ao aprovar solicitação de CPF/CRM ${params.id}`;
        },
        getTarget: (request) => {
          const params = request.params as { id: string };

          return {
            targetEntityType: 'SOLICITATION',
            targetEntityId: params.id,
            targetDisplay: params.id,
          };
        },
        getChanges: (_request, payload) => {
          const response = payload as
            | {
                solicitacao?: unknown;
                notificacaoEnviada?: boolean;
                message?: string;
              }
            | undefined;

          return {
            solicitacao: response?.solicitacao ?? null,
            notificacaoEnviada: response?.notificacaoEnviada ?? null,
          };
        },
        getMetadata: (request, payload) => {
          const params = request.params as { id: string };
          const response = payload as
            | {
                statusCode?: number;
                error?: string;
                message?: string;
              }
            | undefined;

          return {
            source: 'usuarioRoutes.aprovarSolicitacaoCpfCrmRoute',
            idSolicitacao: params.id,
            statusCode: response?.statusCode ?? null,
            error: response?.error ?? null,
            message: response?.message ?? null,
          };
        },
      },
    },
    handler: aprovarSolicitacaoCpfCrmRoute,
  });

  app.route({
    method: 'PATCH',
    url: '/usuarios/solicitacoes-cpf-crm/:id/rejeitar',
    schema: rejeitarSolicitacaoCpfCrmSchema,
    preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    config: {
      audit: {
        enabled: true,
        action: 'REJECT',
        category: 'USER_MANAGEMENT',
        getDescription: (request) => {
          const params = request.params as { id: string };

          return `Solicitação de CPF/CRM ${params.id} rejeitada por admin ${request.user?.email}`;
        },
        getTarget: (request) => {
          const params = request.params as { id: string };

          return {
            targetEntityType: 'SOLICITATION',
            targetEntityId: params.id,
            targetDisplay: params.id,
          };
        },
        getChanges: (request, payload) => {
          const body = request.body as { motivoRejeicao?: string };
          const response = payload as { solicitacao?: unknown } | undefined;

          return {
            solicitacao: response?.solicitacao ?? null,
            motivoRejeicao: body.motivoRejeicao ?? null,
          };
        },
        getMetadata: (request) => {
          const params = request.params as { id: string };

          return {
            source: 'usuarioRoutes.rejeitarSolicitacaoCpfCrmRoute',
            idSolicitacao: params.id,
          };
        },
      },
    },
    handler: rejeitarSolicitacaoCpfCrmRoute,
  });

  app.get(
    '/usuarios/solicitacoes-cpf-crm',
    {
      schema: listarSolicitacoesCpfCrmAdminSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
    },
    listarSolicitacoesCpfCrmAdminRoute,
  );

  app.delete(
    '/usuarios/solicitacoes-cpf-crm/:idSolicitacao',
    {
      schema: deletarSolicitacaoCpfCrmAdminSchema,
      preHandler: [authenticationMiddleware, authorizationMiddleware([tiposPerfil.ADMIN])],
      config: {
        audit: {
          enabled: true,
          action: 'DELETE',
          category: 'USER_MANAGEMENT',
          getDescription: (request) => {
            const params = request.params as { idSolicitacao: string };

            return `Solicitação de CPF/CRM ${params.idSolicitacao} apagada por admin ${request.user?.email}`;
          },
          getTarget: (request) => {
            const params = request.params as { idSolicitacao: string };

            return {
              targetEntityType: 'SOLICITATION',
              targetEntityId: params.idSolicitacao,
              targetDisplay: params.idSolicitacao,
            };
          },
          getChanges: () => null,
          getMetadata: (request) => {
            const params = request.params as { idSolicitacao: string };

            return {
              source: 'usuarioRoutes.deletarSolicitacaoCpfCrmAdminRoute',
              idSolicitacao: params.idSolicitacao,
            };
          },
        },
      },
    },
    deletarSolicitacaoCpfCrmAdminRoute,
  );

  app.get(
    '/usuarios/minhas-solicitacoes-cpf-crm',
    {
      schema: listarMinhasSolicitacoesCpfCrmSchema,
      preHandler: [
        authenticationMiddleware,
        authorizationMiddleware([tiposPerfil.MEDICO, tiposPerfil.ESPECIALISTA]),
      ],
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
