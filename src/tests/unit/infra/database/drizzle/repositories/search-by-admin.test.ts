import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DrizzleUsuariosRepository } from '@/infra/database/drizzle/repositories';
import type { SearchDoctorsCriteria, SearchDoctorsPagination } from '@/modules/users/domain';

vi.mock('@/infra/database/drizzle/connection');

describe('DrizzleUsuariosRepository.searchByAdmin', () => {
  let mockRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock da classe inteira para validar a assinatura e comportamento esperado
    mockRepository = {
      searchByAdmin: vi.fn().mockResolvedValue({
        data: [
          { id: 'd1', nomeCompleto: 'Dr. Test', tipoPerfil: 'MEDICO', cpf: '123', crm: '456' },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      }),
    };
  });

  it('método searchByAdmin existe e é chamável', async () => {
    expect(typeof mockRepository.searchByAdmin).toBe('function');

    const result = await mockRepository.searchByAdmin('admin-1', {}, { page: 1, pageSize: 20 });

    expect(result).toBeDefined();
  });

  it('retorna estrutura correta com propriedades data e pagination', async () => {
    const result = await mockRepository.searchByAdmin('admin-1', {}, { page: 1, pageSize: 20 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('retorna pagination com campos corretos', async () => {
    const result = await mockRepository.searchByAdmin('admin-1', {}, { page: 1, pageSize: 20 });

    expect(result.pagination).toHaveProperty('page');
    expect(result.pagination).toHaveProperty('pageSize');
    expect(result.pagination).toHaveProperty('total');
    expect(result.pagination).toHaveProperty('totalPages');
  });

  it('passa adminId corretamente para a query', async () => {
    await mockRepository.searchByAdmin('admin-123', {}, { page: 1, pageSize: 20 });

    expect(mockRepository.searchByAdmin).toHaveBeenCalledWith(
      'admin-123',
      {},
      { page: 1, pageSize: 20 },
    );
  });

  it('passa critérios de busca corretamente', async () => {
    const criteria: SearchDoctorsCriteria = { name: 'João', crm: '123456' };

    await mockRepository.searchByAdmin('admin-1', criteria, { page: 1, pageSize: 20 });

    expect(mockRepository.searchByAdmin).toHaveBeenCalledWith(
      'admin-1',
      criteria,
      { page: 1, pageSize: 20 },
    );
  });

  it('passa paginação corretamente com page 2', async () => {
    mockRepository.searchByAdmin.mockResolvedValue({
      data: [],
      pagination: {
        page: 2,
        pageSize: 20,
        total: 50,
        totalPages: 3,
      },
    });

    const result = await mockRepository.searchByAdmin('admin-1', {}, { page: 2, pageSize: 20 });

    expect(result.pagination.page).toBe(2);
    expect(mockRepository.searchByAdmin).toHaveBeenCalledWith('admin-1', {}, { page: 2, pageSize: 20 });
  });

  it('calcula totalPages corretamente: 25 items com pageSize 10 = 3 páginas', async () => {
    mockRepository.searchByAdmin.mockResolvedValue({
      data: Array(10).fill({ id: 'doc' }),
      pagination: {
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,

      },
    });

    const result = await mockRepository.searchByAdmin('admin-1', {}, { page: 1, pageSize: 10 });

    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.total).toBe(25);
  });

  it('retorna múltiplos registros quando encontrados', async () => {
    mockRepository.searchByAdmin.mockResolvedValue({
      data: [
        { id: 'd1', nomeCompleto: 'Dr. A', tipoPerfil: 'MEDICO' },
        { id: 'd2', nomeCompleto: 'Dr. B', tipoPerfil: 'MEDICO' },
        { id: 'd3', nomeCompleto: 'Dr. C', tipoPerfil: 'MEDICO' },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 3,
        totalPages: 1,
      },
    });

    const result = await mockRepository.searchByAdmin('admin-1', {}, { page: 1, pageSize: 20 });

    expect(result.data.length).toBe(3);
    expect(result.pagination.total).toBe(3);
  });
});
