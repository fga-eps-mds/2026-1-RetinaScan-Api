import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

    app.setErrorHandler((error, _request, reply) => {
      const err = error as Error & { name?: string };
      if (err.name === 'UnauthorizedError') {
        return reply.status(401).send({
          message: err.message,
        });
      }

      return reply.status(500).send({
        message: err.message,
      });
    });

    await app.register(usuarioRoutes);
    await app.ready();
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
      payload: {},
    });

    expect(res.statusCode).toBe(500);
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
    expect(repoCtorMock).toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalledWith({
      nomeCompleto: 'Gustavo Costa',
      email: 'gustavo@email.com',
      cpf: '52998224725',
      crm: '12345',
      dtNascimento: new Date('2002-10-17'),
      senha: '123456',
      tipoPerfil: 'MEDICO',
    });
  });
});
