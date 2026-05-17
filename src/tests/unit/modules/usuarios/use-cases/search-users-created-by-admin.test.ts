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
    repository.searchByAdmin.mockResolvedValue([]);

    const result = await sut.execute({ adminId: 'admin-1', criteria: {} });

    expect(repository.searchByAdmin).toHaveBeenCalledWith('admin-1', {});
    expect(result).toEqual({
      message: 'Nenhum médico encontrado com os critérios informados.',
      data: [],
    });
  });

  it('returns success message and data when doctors found', async () => {
    const doctors = [
      { id: 'd1', nome: 'Dr. A', crm: '123' },
      { id: 'd2', nome: 'Dr. B', crm: '456' },
    ];

    repository.searchByAdmin.mockResolvedValue(doctors);

    const result = await sut.execute({ adminId: 'admin-1', criteria: { name: 'Dr' } });

    expect(repository.searchByAdmin).toHaveBeenCalledWith('admin-1', { name: 'Dr' });
    expect(result).toEqual({
      message: 'Médicos encontrados com sucesso.',
      data: doctors,
    });
  });
});
