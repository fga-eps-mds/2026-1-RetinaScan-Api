import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExameListItem, ExamesRepository } from '@/modules/exam/exam-repository';
import { ListExamsUseCase } from '@/modules/exam/use-cases/list-exams-usecase';

class FakeExamesRepository implements ExamesRepository {
  create = vi.fn();
  findOne = vi.fn();
  findMany = vi.fn();
  update = vi.fn();
}

let examRepository: FakeExamesRepository;
let usecase: ListExamsUseCase;

const exameItem: ExameListItem = {
  id: 'exam-1',
  nomeCompleto: 'Maria Silva',
  olho: 'AO',
  status: 'CRIADO',
  dtCriacao: new Date('2026-04-24T10:00:00.000Z'),
};

describe('ListExamsUseCase', () => {
  beforeEach(() => {
    examRepository = new FakeExamesRepository();
    usecase = new ListExamsUseCase(examRepository);
    vi.clearAllMocks();
  });

  it('should forward filters (including idUsuario) and pagination to the repository', async () => {
    examRepository.findMany.mockResolvedValue({ data: [], total: 0 });

    await usecase.execute({
      filters: { idUsuario: 'medico-1', cpf: '12345678900', nomeCompleto: 'Maria', status: 'CRIADO' },
      pagination: { page: 2, pageSize: 10 },
    });

    expect(examRepository.findMany).toHaveBeenCalledWith({
      filters: { idUsuario: 'medico-1', cpf: '12345678900', nomeCompleto: 'Maria', status: 'CRIADO' },
      pagination: { page: 2, pageSize: 10 },
    });
  });

  it('should return data with computed pagination metadata', async () => {
    examRepository.findMany.mockResolvedValue({ data: [exameItem], total: 23 });

    const result = await usecase.execute({
      filters: { idUsuario: 'medico-1' },
      pagination: { page: 1, pageSize: 10 },
    });

    expect(result).toEqual({
      data: [exameItem],
      pagination: { page: 1, pageSize: 10, total: 23, totalPages: 3 },
    });
  });

  it('should compute zero totalPages when total is zero', async () => {
    examRepository.findMany.mockResolvedValue({ data: [], total: 0 });

    const result = await usecase.execute({
      filters: { idUsuario: 'medico-1' },
      pagination: { page: 1, pageSize: 20 },
    });

    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.data).toEqual([]);
  });
});
