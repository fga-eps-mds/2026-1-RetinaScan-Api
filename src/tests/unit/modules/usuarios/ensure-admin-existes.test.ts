import { describe, it, expect, beforeEach, vi } from 'vitest';

const selectMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();
const limitMock = vi.fn();

const setMock = vi.fn();
const updateWhereMock = vi.fn();

const signUpEmailMock = vi.fn();

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/infra/logger', () => ({
  default: logger,
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signUpEmail: signUpEmailMock,
    },
  },
}));

vi.mock('@/infra/database/drizzle/schema', () => ({
  usuario: {
    id: 'id',
    email: 'email',
    cpf: 'cpf',
    crm: 'crm',
    tipoPerfil: 'tipoPerfil',
  },
}));

vi.mock('@/infra/database/drizzle/connection', () => ({
  db: {
    select: selectMock,
    update: vi.fn(() => ({
      set: setMock,
    })),
  },
}));

vi.mock('@/env', () => ({
  env: {
    ADMIN_EMAIL: 'admin@test.com',
    ADMIN_PASSWORD: '123456',
    ADMIN_NAME: 'Administrador',
    ADMIN_BIRTH_DATE: '1980-01-01',
    ADMIN_CRM: '0001',
    ADMIN_CPF: '00000000000',
  },
}));

selectMock.mockReturnValue({
  from: fromMock,
});

fromMock.mockReturnValue({
  where: whereMock,
});

whereMock.mockReturnValue({
  limit: limitMock,
});

setMock.mockReturnValue({
  where: updateWhereMock,
});

describe('ensureAdminUserExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create admin if not exists', async () => {
    limitMock.mockResolvedValue([]);

    const mod = await import('@/modules/users/use-cases/ensure-admin-exists.js');

    await mod.ensureAdminUserExists();

    expect(signUpEmailMock).toHaveBeenCalled();
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it('should not create admin if already exists', async () => {
    limitMock.mockResolvedValue([
      {
        idUsuario: 'admin-id',
        email: 'admin@test.com',
        cpf: '00000000000',
        crm: '0001',
        tipoPerfil: 'ADMIN',
      },
    ]);

    const mod = await import('@/modules/users/use-cases/ensure-admin-exists.js');

    await mod.ensureAdminUserExists();

    expect(signUpEmailMock).not.toHaveBeenCalled();
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it('should not recreate admin when email changed but cpf/crm already exist', async () => {
    limitMock.mockResolvedValue([
      {
        idUsuario: 'admin-id',
        email: 'admin-alterado@test.com',
        cpf: '00000000000',
        crm: '0001',
        tipoPerfil: 'ADMIN',
      },
    ]);

    const mod = await import('@/modules/users/use-cases/ensure-admin-exists.js');

    await mod.ensureAdminUserExists();

    expect(signUpEmailMock).not.toHaveBeenCalled();
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it('should log error and throw', async () => {
    limitMock.mockRejectedValue(new Error('db fail'));

    const mod = await import('@/modules/users/use-cases/ensure-admin-exists.js');

    await expect(mod.ensureAdminUserExists()).rejects.toThrow();

    expect(logger.error).toHaveBeenCalled();
  });

  it('should skip seed when ADMIN env vars are missing', async () => {
    vi.resetModules();

    vi.doMock('@/env', () => ({
      env: {
        ADMIN_EMAIL: '',
        ADMIN_PASSWORD: '',
        ADMIN_NAME: '',
        ADMIN_BIRTH_DATE: '',
        ADMIN_CRM: '',
        ADMIN_CPF: '',
      },
    }));

    const mod = await import('@/modules/users/use-cases/ensure-admin-exists.js');

    await mod.ensureAdminUserExists();

    expect(logger.warn).toHaveBeenCalledWith('Seed do admin ignorado: variáveis ADMIN_* ausentes.');

    expect(signUpEmailMock).not.toHaveBeenCalled();
  });
});
