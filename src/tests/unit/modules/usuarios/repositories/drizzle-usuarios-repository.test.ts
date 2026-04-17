import { describe, it, expect, beforeEach, vi } from 'vitest';

const limitMock = vi.fn();
const whereMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();

vi.mock('@/infra/database/drizzle/connection', () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock('@/infra/database/drizzle/schema', () => ({
  usuario: {
    email: 'email',
    cpf: 'cpf',
    crm: 'crm',
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

describe('DrizzleUsuariosRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find by email', async () => {
    limitMock.mockResolvedValue([{ id: '1', email: 'teste@mail.com' }]);

    const mod = await import('@/modules/users/repositories/drizzle-usuarios-repository.js');

    const repository = new mod.DrizzleUsuariosRepository();

    const result = await repository.findByEmail('teste@mail.com');

    expect(result).toEqual({
      id: '1',
      email: 'teste@mail.com',
    });
  });

  it('should return null when email not found', async () => {
    limitMock.mockResolvedValue([]);

    const mod = await import('@/modules/users/repositories/drizzle-usuarios-repository.js');

    const repository = new mod.DrizzleUsuariosRepository();

    const result = await repository.findByEmail('none@mail.com');

    expect(result).toBeNull();
  });

  it('should find by cpf', async () => {
    limitMock.mockResolvedValue([{ id: '1', cpf: '12345678900' }]);

    const mod = await import('@/modules/users/repositories/drizzle-usuarios-repository.js');

    const repository = new mod.DrizzleUsuariosRepository();

    const result = await repository.findByCpf('12345678900');

    expect(result?.cpf).toBe('12345678900');
  });

  it('should find by crm', async () => {
    limitMock.mockResolvedValue([{ id: '1', crm: '12345' }]);

    const mod = await import('@/modules/users/repositories/drizzle-usuarios-repository.js');

    const repository = new mod.DrizzleUsuariosRepository();

    const result = await repository.findByCrm('12345');

    expect(result?.crm).toBe('12345');
  });

  it('should return null when crm not found', async () => {
    limitMock.mockResolvedValue([]);

    const mod = await import('@/modules/users/repositories/drizzle-usuarios-repository.js');

    const repository = new mod.DrizzleUsuariosRepository();

    const result = await repository.findByCrm('000');

    expect(result).toBeNull();
  });
});
