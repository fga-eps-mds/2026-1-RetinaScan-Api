import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { usuarioRoutes } from '@/api/routes/usuarios';

const { getSessionMock, executeMock, repoCtorMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  executeMock: vi.fn(),
  repoCtorMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock('@/modules/users/use-cases/create-user-by-admin', () => ({
  CreateUserByAdmin: vi.fn(
    class {
      constructor() {}
      execute = executeMock;
    },
  ),
}));

vi.mock('@/modules/users/repositories/drizzle-usuarios-repository', () => ({
  DrizzleUsuariosRepository: vi.fn(
    class {
      constructor() {
        repoCtorMock();
      }
    },
  ),
}));

describe('POST /usuarios', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();

    await app.register(usuarioRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 401 when not authenticated', async () => {
    getSessionMock.mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios',
      payload: {},
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 500 when body is invalid', async () => {
    getSessionMock.mockResolvedValue({
      user: { tipoPerfil: 'ADMIN' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios',
      payload: {
        nomeCompleto: 'Gustavo Costa',
        email: 'gustavo@email.com',
        cpf: '12345',
        crm: '12345',
        dtNascimento: '2002-10-17',
        senha: '123456',
        tipoPerfil: 'MEDICO',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should create user successfully', async () => {
    getSessionMock.mockResolvedValue({
      user: { tipoPerfil: 'ADMIN' },
    });

    executeMock.mockResolvedValue(undefined);

    const res = await app.inject({
      method: 'POST',
      url: '/usuarios',
      payload: {
        nomeCompleto: 'Gustavo Costa',
        email: 'gustavo@email.com',
        cpf: '52998224725',
        crm: '12345',
        dtNascimento: '2002-10-17',
        senha: '123456',
        tipoPerfil: 'MEDICO',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(repoCtorMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });
});
