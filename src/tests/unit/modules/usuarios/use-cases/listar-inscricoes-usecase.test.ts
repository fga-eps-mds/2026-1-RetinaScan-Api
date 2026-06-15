import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListarInscricoesUsecase } from '@/modules/users/use-cases/listar-inscricoes-usecase';

describe('ListarInscricoesUsecase', () => {
  let inscricaoRepo: any;
  let usecase: ListarInscricoesUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    inscricaoRepo = {
      listar: vi.fn().mockResolvedValue([]),
    };
    usecase = new ListarInscricoesUsecase(inscricaoRepo);
  });

  it('should return list from repo without encryptedPassword', async () => {
    inscricaoRepo.listar.mockResolvedValue([
      { id: '1', email: 'a@a.com', status: 'PENDENTE', encryptedPassword: 'secret' },
    ]);

    const result = await usecase.execute({});

    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('encryptedPassword');
    expect(result[0].id).toBe('1');
  });

  it('should pass status filter to repo', async () => {
    await usecase.execute({ status: 'PENDENTE' });
    expect(inscricaoRepo.listar).toHaveBeenCalledWith({ status: 'PENDENTE' });
  });

  it('should call repo without filter when no status provided', async () => {
    await usecase.execute({});
    expect(inscricaoRepo.listar).toHaveBeenCalledWith({});
  });
});
