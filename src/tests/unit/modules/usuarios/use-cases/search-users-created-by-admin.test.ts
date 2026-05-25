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

  it('passes name criteria correctly to repository', async () => {
    repository.searchByAdmin.mockResolvedValue({
      data: [{ id: 'd1', nomeCompleto: 'Dr. João Silva' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    await sut.execute({
      adminId: 'admin-1',
      criteria: { name: 'João' },
      pagination: { page: 1, pageSize: 20 },
    });

    expect(repository.searchByAdmin).toHaveBeenCalledWith('admin-1', { name: 'João' }, { page: 1, pageSize: 20 });
  });

  it('passes crm criteria correctly to repository', async () => {
    repository.searchByAdmin.mockResolvedValue({
      data: [{ id: 'd1', crm: '123456' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    await sut.execute({
      adminId: 'admin-1',
      criteria: { crm: '123456' },
      pagination: { page: 1, pageSize: 20 },
    });

    expect(repository.searchByAdmin).toHaveBeenCalledWith('admin-1', { crm: '123456' }, { page: 1, pageSize: 20 });
  });

  it('passes email criteria correctly to repository', async () => {
    repository.searchByAdmin.mockResolvedValue({
      data: [{ id: 'd1', email: 'doctor@example.com' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    await sut.execute({
      adminId: 'admin-1',
      criteria: { email: 'doctor@example.com' },
      pagination: { page: 1, pageSize: 20 },
    });

    expect(repository.searchByAdmin).toHaveBeenCalledWith(
      'admin-1',
      { email: 'doctor@example.com' },
      { page: 1, pageSize: 20 },
    );
  });

  it('passes multiple criteria simultaneously to repository', async () => {
    repository.searchByAdmin.mockResolvedValue({
      data: [{ id: 'd1' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    await sut.execute({
      adminId: 'admin-1',
      criteria: { name: 'Dr. João', crm: '123456', email: 'joao@example.com' },
      pagination: { page: 1, pageSize: 20 },
    });

    expect(repository.searchByAdmin).toHaveBeenCalledWith(
      'admin-1',
      { name: 'Dr. João', crm: '123456', email: 'joao@example.com' },
      { page: 1, pageSize: 20 },
    );
  });

  it('calculates pagination correctly for page 2 with offset', async () => {
    repository.searchByAdmin.mockResolvedValue({
      data: Array(20).fill({ id: 'doc' }),
      pagination: { page: 2, pageSize: 20, total: 50, totalPages: 3 },
    });

    const result = await sut.execute({
      adminId: 'admin-1',
      criteria: {},
      pagination: { page: 2, pageSize: 20 },
    });

    expect(repository.searchByAdmin).toHaveBeenCalledWith('admin-1', {}, { page: 2, pageSize: 20 });
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.total).toBe(50);
  });

  it('calculates totalPages correctly with 25 items and pageSize 10', async () => {
    repository.searchByAdmin.mockResolvedValue({
      data: Array(10).fill({ id: 'doc' }),
      pagination: { page: 1, pageSize: 10, total: 25, totalPages: 3 },
    });

    const result = await sut.execute({
      adminId: 'admin-1',
      criteria: {},
      pagination: { page: 1, pageSize: 10 },
    });

    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.total).toBe(25);
  });
});
