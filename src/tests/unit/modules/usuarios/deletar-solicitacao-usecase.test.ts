import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/shared/errors';
import { DeletarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases/deletar-solicitacao-usecase';

describe('DeletarSolicitacaoCpfCrmUsecase', () => {
  const repository = {
    deletar: vi.fn(),
  };

  let usecase: DeletarSolicitacaoCpfCrmUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    usecase = new DeletarSolicitacaoCpfCrmUsecase(repository as never);
  });

  it('deve deletar uma solicitacao existente', async () => {
    repository.deletar.mockResolvedValueOnce({
      id: 'sol-1',
      status: 'PENDENTE',
    });

    await expect(usecase.execute({ idSolicitacao: 'sol-1' })).resolves.toBeUndefined();

    expect(repository.deletar).toHaveBeenCalledWith('sol-1');
  });

  it('deve lançar erro quando a solicitacao nao existir', async () => {
    repository.deletar.mockResolvedValueOnce(null);

    await expect(usecase.execute({ idSolicitacao: 'sol-x' })).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect(repository.deletar).toHaveBeenCalledWith('sol-x');
  });
});
