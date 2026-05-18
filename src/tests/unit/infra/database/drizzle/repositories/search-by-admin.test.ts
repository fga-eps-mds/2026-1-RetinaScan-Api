import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories/drizzle-usuario-repository';

const {
  mockSelect,
  mockFromRows,
  mockWhereRows,
  mockOrderBy,
  mockLimit,
  mockOffset,
  mockFromCount,
  mockWhereCount,
} = vi.hoisted(() => {
  const mockOffset = vi.fn();
  const mockLimit = vi.fn(() => ({
    offset: mockOffset,
  }));
  const mockOrderBy = vi.fn(() => ({
    limit: mockLimit,
  }));
  const mockWhereRows = vi.fn(() => ({
    orderBy: mockOrderBy,
  }));
  const mockWhereCount = vi.fn();
  const mockFromRows = vi.fn(() => ({
    where: mockWhereRows,
  }));
  const mockFromCount = vi.fn(() => ({
    where: mockWhereCount,
  }));
  const mockSelect = vi.fn((fields?: unknown) => {
    if (fields) {
      return { from: mockFromCount };
    }

    return { from: mockFromRows };
  });

  return {
    mockSelect,
    mockFromRows,
    mockWhereRows,
    mockOrderBy,
    mockLimit,
    mockOffset,
    mockFromCount,
    mockWhereCount,
  };
});

vi.mock('@/infra/database/drizzle/connection', () => ({
  db: {
    select: mockSelect,
  },
}));

describe('DrizzleUsuariosRepository.searchByAdmin', () => {
  let repository: DrizzleUsuariosRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new DrizzleUsuariosRepository();
  });

  it('deve buscar medicos por admin com critérios e paginação', async () => {
    mockOffset.mockResolvedValueOnce([
      { id: 'd1', nomeCompleto: 'Dr. A', tipoPerfil: 'MEDICO' },
      { id: 'd2', nomeCompleto: 'Dr. B', tipoPerfil: 'MEDICO' },
    ]);
    mockWhereCount.mockResolvedValueOnce([{ value: 25 }]);

    const result = await repository.searchByAdmin(
      'admin-1',
      { name: 'Dr', crm: '123', email: 'medico@teste.com' },
      { page: 2, pageSize: 20 },
    );

    expect(mockSelect).toHaveBeenCalledTimes(2);
    expect(mockFromRows).toHaveBeenCalledTimes(1);
    expect(mockWhereRows).toHaveBeenCalledTimes(1);
    expect(mockOrderBy).toHaveBeenCalledTimes(1);
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(mockOffset).toHaveBeenCalledWith(20);
    expect(mockFromCount).toHaveBeenCalledTimes(1);
    expect(mockWhereCount).toHaveBeenCalledTimes(1);

    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 25,
      totalPages: 2,
    });
  });

  it('deve calcular totalPages com arredondamento para cima', async () => {
    mockOffset.mockResolvedValueOnce([]);
    mockWhereCount.mockResolvedValueOnce([{ value: 21 }]);

    const result = await repository.searchByAdmin('admin-1', {}, { page: 1, pageSize: 20 });

    expect(result.pagination.total).toBe(21);
    expect(result.pagination.totalPages).toBe(2);
  });

  it('deve retornar totalPages igual a zero quando pageSize for zero', async () => {
    mockOffset.mockResolvedValueOnce([]);
    mockWhereCount.mockResolvedValueOnce([{ value: 10 }]);

    const result = await repository.searchByAdmin('admin-1', {}, { page: 1, pageSize: 0 });

    expect(result.pagination.total).toBe(10);
    expect(result.pagination.totalPages).toBe(0);
  });
});
