import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchDoctorsUseCase } from '@/modules/users/use-cases/search-users-created-by-admin';

describe('SearchDoctorsUseCase', () => {
  let repository: any;
  let sut: SearchDoctorsUseCase;

  beforeEach(() => {
    repository = {
      searchByAdmin: vi.fn(),
    };

    sut = new SearchDoctorsUseCase(repository);
  });

  it('returns empty message and empty data when no doctors found', async () => {
    repository.searchByAdmin.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const result = await sut.execute({ adminId: 'admin-1', criteria: {}, pagination: { page: 1, pageSize: 20 } });

    expect(repository.searchByAdmin).toHaveBeenCalledWith('admin-1', {}, { page: 1, pageSize: 20 });
    expect(result).toEqual({
      message: 'Nenhum médico encontrado com os critérios informados.',
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
  });

  it('returns success message and data when doctors found', async () => {
    const doctors = [
      { id: 'd1', nome: 'Dr. A', crm: '123' },
      { id: 'd2', nome: 'Dr. B', crm: '456' },
    ];

    repository.searchByAdmin.mockResolvedValue({
      data: doctors,
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });

    const result = await sut.execute({
      adminId: 'admin-1',
      criteria: { name: 'Dr' },
      pagination: { page: 1, pageSize: 20 },
    });

    expect(repository.searchByAdmin).toHaveBeenCalledWith('admin-1', { name: 'Dr' }, { page: 1, pageSize: 20 });
    expect(result).toEqual({
      message: 'Médicos encontrados com sucesso.',
      data: doctors,
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });
  });
});
