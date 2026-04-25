import { beforeEach, describe, expect, it, vi } from 'vitest';
import { solicitacaoStatus, type SolicitacaoCpfCrm } from '@/modules/users/domain';
import type { SolicitacaoCpfCrmRepository } from '@/modules/users/repositories';
import { ListarSolicitacoesCpfCrmUsecase } from '@/modules/users/use-cases/listar-solicitacoes-cpf-crm.usecase';

class FakeSolicitacaoCpfCrmRepository implements SolicitacaoCpfCrmRepository {
  criar = vi.fn();
  findPendenteByUsuario = vi.fn();
  listar = vi.fn();
  aprovar = vi.fn();
  rejeitar = vi.fn();
}

describe('ListarSolicitacoesCpfCrmUsecase', () => {
  let solicitacaoRepository: FakeSolicitacaoCpfCrmRepository;
  let usecase: ListarSolicitacoesCpfCrmUsecase;

  const solicitacoes: SolicitacaoCpfCrm[] = [
    {
      id: 'sol-1',
      idUsuario: 'medico-1',
      cpfNovo: '52998224725',
      crmNovo: 'CRM-1234',
      status: solicitacaoStatus.PENDENTE,
      motivoRejeicao: null,
      analisadoPor: null,
      analisadoEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'sol-2',
      idUsuario: 'medico-2',
      cpfNovo: '11144477735',
      crmNovo: 'CRM-5678',
      status: solicitacaoStatus.APROVADA,
      motivoRejeicao: null,
      analisadoPor: 'admin-1',
      analisadoEm: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    solicitacaoRepository = new FakeSolicitacaoCpfCrmRepository();
    usecase = new ListarSolicitacoesCpfCrmUsecase(solicitacaoRepository);
  });

  it('deve listar todas as solicitacoes sem filtro', async () => {
    solicitacaoRepository.listar.mockResolvedValueOnce(solicitacoes);

    const result = await usecase.execute();

    expect(solicitacaoRepository.listar).toHaveBeenCalledWith(undefined);
    expect(result.solicitacoes).toHaveLength(2);
    expect(result.solicitacoes).toEqual(solicitacoes);
  });

  it('deve listar apenas solicitacoes pendentes quando filtrado por status', async () => {
    const pendentes = solicitacoes.filter((s) => s.status === solicitacaoStatus.PENDENTE);
    solicitacaoRepository.listar.mockResolvedValueOnce(pendentes);

    const result = await usecase.execute({ status: solicitacaoStatus.PENDENTE });

    expect(solicitacaoRepository.listar).toHaveBeenCalledWith({ status: solicitacaoStatus.PENDENTE });
    expect(result.solicitacoes).toHaveLength(1);
    expect(result.solicitacoes[0].status).toBe(solicitacaoStatus.PENDENTE);
  });

  it('deve listar solicitacoes de um usuario especifico', async () => {
    const doMedico = solicitacoes.filter((s) => s.idUsuario === 'medico-1');
    solicitacaoRepository.listar.mockResolvedValueOnce(doMedico);

    const result = await usecase.execute({ idUsuario: 'medico-1' });

    expect(solicitacaoRepository.listar).toHaveBeenCalledWith({ idUsuario: 'medico-1' });
    expect(result.solicitacoes).toHaveLength(1);
    expect(result.solicitacoes[0].idUsuario).toBe('medico-1');
  });

  it('deve retornar lista vazia quando nao houver solicitacoes', async () => {
    solicitacaoRepository.listar.mockResolvedValueOnce([]);

    const result = await usecase.execute();

    expect(result.solicitacoes).toHaveLength(0);
  });
});