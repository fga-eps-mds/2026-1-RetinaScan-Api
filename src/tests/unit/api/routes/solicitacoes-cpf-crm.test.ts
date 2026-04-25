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

  // --- POST: solicitar ---

  it('should create a request with both cpf and crm', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'medico-1', email: 'medico@email.com', name: 'Medico Teste', tipoPerfil: 'MEDICO' },
    });
    executeSolicitacaoMock.mockResolvedValueOnce({ idSolicitacao: 'sol-1', status: 'PENDENTE' });

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/solicitacoes-cpf-crm',
      payload: { cpfNovo: '52998224725', crmNovo: '12345-DF' },
    });

    expect(res.statusCode).toBe(201);
    expect(executeSolicitacaoMock).toHaveBeenCalledWith({
      idUsuario: 'medico-1',
      cpfNovo: '52998224725',
      crmNovo: '12345-DF',
    });
  });

  it('should create a request with only cpf', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'medico-1', email: 'medico@email.com', name: 'Medico Teste', tipoPerfil: 'MEDICO' },
    });
    executeSolicitacaoMock.mockResolvedValueOnce({ idSolicitacao: 'sol-1', status: 'PENDENTE' });

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/solicitacoes-cpf-crm',
      payload: { cpfNovo: '52998224725' },
    });

    expect(res.statusCode).toBe(201);
    expect(executeSolicitacaoMock).toHaveBeenCalledWith(
      expect.objectContaining({ cpfNovo: '52998224725', crmNovo: undefined }),
    );
  });

  it('should create a request with only crm', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'medico-1', email: 'medico@email.com', name: 'Medico Teste', tipoPerfil: 'MEDICO' },
    });
    executeSolicitacaoMock.mockResolvedValueOnce({ idSolicitacao: 'sol-1', status: 'PENDENTE' });

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/solicitacoes-cpf-crm',
      payload: { crmNovo: '12345-DF' },
    });

    expect(res.statusCode).toBe(201);
    expect(executeSolicitacaoMock).toHaveBeenCalledWith(
      expect.objectContaining({ cpfNovo: undefined, crmNovo: '12345-DF' }),
    );
  });

  it('should return 400 when neither cpf nor crm is provided', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'medico-1', email: 'medico@email.com', name: 'Medico Teste', tipoPerfil: 'MEDICO' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/solicitacoes-cpf-crm',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(executeSolicitacaoMock).not.toHaveBeenCalled();
  });

  it('should return 403 when a non-medical user tries to create a request', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@email.com', name: 'Admin Teste', tipoPerfil: 'ADMIN' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios/solicitacoes-cpf-crm',
      payload: { cpfNovo: '52998224725', crmNovo: '12345-DF' },
    });

    expect(res.statusCode).toBe(403);
    expect(executeSolicitacaoMock).not.toHaveBeenCalled();
  });

  // --- PATCH: aprovar / rejeitar ---

  it('should approve a request for an admin user', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@email.com', name: 'Admin Teste', tipoPerfil: 'ADMIN' },
    });
    executeAprovarMock.mockResolvedValueOnce({ solicitacao: { id: 'sol-1', status: 'APROVADA' } });

    const res = await app.inject({
      method: 'PATCH',
      url: '/usuarios/solicitacoes-cpf-crm/sol-1/aprovar',
    });

    expect(res.statusCode).toBe(200);
    expect(executeAprovarMock).toHaveBeenCalledWith({ idSolicitacao: 'sol-1', idAdmin: 'admin-1' });
  });

  it('should reject a request for an admin user', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@email.com', name: 'Admin Teste', tipoPerfil: 'ADMIN' },
    });
    executeRejeitarMock.mockResolvedValueOnce({ solicitacao: { id: 'sol-1', status: 'REJEITADA' } });

    const res = await app.inject({
      method: 'PATCH',
      url: '/usuarios/solicitacoes-cpf-crm/sol-1/rejeitar',
      payload: { motivoRejeicao: 'Dados divergentes' },
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
      user: { id: 'admin-1', email: 'admin@email.com', name: 'Admin Teste', tipoPerfil: 'ADMIN' },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/usuarios/solicitacoes-cpf-crm/sol-1/rejeitar',
      payload: { motivoRejeicao: '   ' },
    });

    expect(res.statusCode).toBe(400);
  });

  // --- GET: admin lista todas as solicitações ---

  it('should list all requests for an admin user', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@email.com', name: 'Admin Teste', tipoPerfil: 'ADMIN' },
    });

    const executeMock = vi.fn().mockResolvedValue({
      solicitacoes: [{ id: 'sol-1', status: 'PENDENTE' }, { id: 'sol-2', status: 'APROVADA' }],
    });
    resolveMock.mockImplementation((key: string) => {
      if (key === 'listarSolicitacoesCpfCrmUsecase') return { execute: executeMock };
      throw new Error(`Unknown resolve key: ${key}`);
    });

    const res = await app.inject({ method: 'GET', url: '/usuarios/solicitacoes-cpf-crm' });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).solicitacoes).toHaveLength(2);
    // admin pode filtrar por idUsuario
    expect(executeMock).toHaveBeenCalledWith(expect.not.objectContaining({ idUsuario: 'admin-1' }));
  });

  it('should return 403 when a medical user tries to access admin listing route', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'medico-1', email: 'medico@email.com', name: 'Medico Teste', tipoPerfil: 'MEDICO' },
    });

    const res = await app.inject({ method: 'GET', url: '/usuarios/solicitacoes-cpf-crm' });

    expect(res.statusCode).toBe(403);
  });

  // --- GET: médico lista apenas as próprias solicitações ---

  it('should list own requests when medical user accesses the medico route', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'medico-1', email: 'medico@email.com', name: 'Medico Teste', tipoPerfil: 'MEDICO' },
    });

    const executeMock = vi.fn().mockResolvedValue({ solicitacoes: [] });
    resolveMock.mockImplementation((key: string) => { 
      if (key === 'listarSolicitacoesCpfCrmUsecase') return { execute: executeMock };
      throw new Error(`Unknown resolve key: ${key}`);
    });

    const res = await app.inject({ method: 'GET', url: '/usuarios/minhas-solicitacoes-cpf-crm' });

    expect(res.statusCode).toBe(200);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ idUsuario: 'medico-1' }),
    );
  });

  it('should return 403 when admin tries to access medico listing route', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@email.com', name: 'Admin Teste', tipoPerfil: 'ADMIN' },
    });

    const res = await app.inject({ method: 'GET', url: '/usuarios/minhas-solicitacoes-cpf-crm' });

    expect(res.statusCode).toBe(403);
  });
});
