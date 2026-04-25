import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usuarioRoutes } from '@/api/routes/usuarios';

const { resolveMock, executeSolicitacaoMock, executeAprovarMock, executeRejeitarMock } = vi.hoisted(
  () => ({
    resolveMock: vi.fn(),
    executeSolicitacaoMock: vi.fn(),
    executeAprovarMock: vi.fn(),
    executeRejeitarMock: vi.fn(),
  }),
);

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock('@/infra/container', () => ({
  container: {
    resolve: resolveMock,
  },
}));

vi.mock('@/modules/users/use-cases/create-user-by-admin', () => ({
  CreateUserByAdmin: vi.fn(
    class {
      constructor() {}
      execute = vi.fn();
    },
  ),
}));

vi.mock('@/modules/users/use-cases/get-all-users', () => ({
  GetAllUsers: vi.fn(
    class {
      constructor() {}
      execute = vi.fn();
    },
  ),
}));

vi.mock('@/modules/users/use-cases/update-user-usecase', () => ({
  UpdateUserUsecase: vi.fn(
    class {
      constructor() {}
      execute = vi.fn();
    },
  ),
}));

vi.mock('@/modules/users/use-cases/update-user-image-usecase', () => ({
  UpdateUserImageUsecase: vi.fn(
    class {
      constructor() {}
      execute = vi.fn();
    },
  ),
}));

vi.mock('@/infra/database/drizzle/repositories/drizzle-usuario-repository', () => ({
  DrizzleUsuariosRepository: vi.fn(
    class {
      constructor() {}
    },
  ),
}));

vi.mock('@/infra/storage/minio-storage-service', () => ({
  MinioStorageService: vi.fn(
    class {
      constructor() {}
    },
  ),
}));

describe('solicitação de CPF/CRM routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    resolveMock.mockImplementation((key: string) => {
      if (key === 'solicitarAlteracaoCpfCrmUsecase') {
        return { execute: executeSolicitacaoMock };
      }

      if (key === 'aprovarSolicitacaoCpfCrmUsecase') {
        return { execute: executeAprovarMock };
      }

      if (key === 'rejeitarSolicitacaoCpfCrmUsecase') {
        return { execute: executeRejeitarMock };
      }

      throw new Error(`Unknown resolve key: ${key}`);
    });

    app = Fastify();
    await app.register(usuarioRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should create a cpf/crm request for an authenticated medical user', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'medico-1',
        email: 'medico@email.com',
        name: 'Medico Teste',
        tipoPerfil: 'MEDICO',
      },
    });
    executeSolicitacaoMock.mockResolvedValueOnce({ idSolicitacao: 'sol-1', status: 'PENDENTE' });

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/solicitacoes-cpf-crm',
      payload: {
        cpfNovo: '52998224725',
        crmNovo: '12345-DF',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(executeSolicitacaoMock).toHaveBeenCalledWith({
      idUsuario: 'medico-1',
      cpfNovo: '52998224725',
      crmNovo: '12345-DF',
    });
    expect(JSON.parse(res.body)).toEqual({ idSolicitacao: 'sol-1', status: 'PENDENTE' });
  });

  it('should return 403 when a non-medical user tries to create a request', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@email.com',
        name: 'Admin Teste',
        tipoPerfil: 'ADMIN',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/solicitacoes-cpf-crm',
      payload: {
        cpfNovo: '52998224725',
        crmNovo: '12345-DF',
      },
    });

    expect(res.statusCode).toBe(403);
    expect(executeSolicitacaoMock).not.toHaveBeenCalled();
  });

  it('should approve a request for an admin user', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@email.com',
        name: 'Admin Teste',
        tipoPerfil: 'ADMIN',
      },
    });
    executeAprovarMock.mockResolvedValueOnce({
      solicitacao: { id: 'sol-1', status: 'APROVADA' },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/usuarios/solicitacoes-cpf-crm/sol-1/aprovar',
    });

    expect(res.statusCode).toBe(200);
    expect(executeAprovarMock).toHaveBeenCalledWith({
      idSolicitacao: 'sol-1',
      idAdmin: 'admin-1',
    });
  });

  it('should reject a request for an admin user', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@email.com',
        name: 'Admin Teste',
        tipoPerfil: 'ADMIN',
      },
    });
    executeRejeitarMock.mockResolvedValueOnce({
      solicitacao: { id: 'sol-1', status: 'REJEITADA' },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/usuarios/solicitacoes-cpf-crm/sol-1/rejeitar',
      payload: {
        motivoRejeicao: 'Dados divergentes',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(executeRejeitarMock).toHaveBeenCalledWith({
      idSolicitacao: 'sol-1',
      idAdmin: 'admin-1',
      motivoRejeicao: 'Dados divergentes',
    });
  });

  it('should return 400 when reject body is invalid', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@email.com',
        name: 'Admin Teste',
        tipoPerfil: 'ADMIN',
      },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/usuarios/solicitacoes-cpf-crm/sol-1/rejeitar',
      payload: {
        motivoRejeicao: '   ',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should list all requests for an admin user', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        email: 'admin@email.com',
        name: 'Admin Teste',
        tipoPerfil: 'ADMIN',
      },
    });

    resolveMock.mockImplementation((key: string) => {
      if (key === 'listarSolicitacoesCpfCrmUsecase') {
        return {
          execute: vi.fn().mockResolvedValue({
            solicitacoes: [
              { id: 'sol-1', status: 'PENDENTE' },
              { id: 'sol-2', status: 'APROVADA' },
            ],
          }),
        };
      }
      throw new Error(`Unknown resolve key: ${key}`);
    });

    const res = await app.inject({
      method: 'GET',
      url: '/usuarios/solicitacoes-cpf-crm',
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).solicitacoes).toHaveLength(2);
  });

  it('should return 403 when a non-admin user tries to list requests', async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: 'medico-1',
        email: 'medico@email.com',
        name: 'Medico Teste',
        tipoPerfil: 'MEDICO',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/usuarios/solicitacoes-cpf-crm',
    });

    expect(res.statusCode).toBe(403);
  });
});
