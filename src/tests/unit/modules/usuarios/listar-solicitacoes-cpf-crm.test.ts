import { beforeEach, describe, expect, it, vi } from 'vitest';
import { solicitacaoStatus, type SolicitacaoCpfCrm } from '@/modules/users/domain';
import type { SolicitacaoCpfCrmRepository } from '@/modules/users/repositories';
import { ListarSolicitacoesCpfCrmUsecase } from '@/modules/users/use-cases/listar-solicitacoes-cpf-crm';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

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

  const usuarioMedico1 = UsuarioBuilder.anUser()
    .withNomeCompleto('Medico Um')
    .withEmail('medico1@test.com')
    .getData();

  const usuarioMedico2 = UsuarioBuilder.anUser()
    .withNomeCompleto('Medico Dois')
    .withEmail('medico2@test.com')
    .getData();

  const solicitacoes: SolicitacaoCpfCrm[] = [
    {
      id: 'sol-1',
      idUsuario: usuarioMedico1.id,
      cpfNovo: '52998224725',
      crmNovo: 'CRM-1234',
      status: solicitacaoStatus.PENDENTE,
      motivoRejeicao: null,
      analisadoPor: null,
      analisadoEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      usuario: usuarioMedico1,
    },
    {
      id: 'sol-2',
      idUsuario: usuarioMedico2.id,
      cpfNovo: '11144477735',
      crmNovo: 'CRM-5678',
      status: solicitacaoStatus.APROVADA,
      motivoRejeicao: null,
      analisadoPor: 'admin-1',
      analisadoEm: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      usuario: usuarioMedico2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    solicitacaoRepository = new FakeSolicitacaoCpfCrmRepository();
    usecase = new ListarSolicitacoesCpfCrmUsecase(solicitacaoRepository);
  });

  it('deve listar todas as solicitacoes sem filtro e passar relations true para a repository', async () => {
    solicitacaoRepository.listar.mockResolvedValueOnce(solicitacoes);

    const result = await usecase.execute();

    expect(solicitacaoRepository.listar).toHaveBeenCalledWith({ relations: true });
    expect(result.solicitacoes).toHaveLength(2);
    expect(result.solicitacoes[0]).toMatchObject({
      id: 'sol-1',
      idUsuario: usuarioMedico1.id,
      nomeCompleto: usuarioMedico1.nomeCompleto,
      email: usuarioMedico1.email,
    });
    expect(result.solicitacoes[0]).not.toHaveProperty('usuario');
  });

  it('deve listar apenas solicitacoes pendentes quando filtrado por status', async () => {
    const pendentes = solicitacoes.filter((s) => s.status === solicitacaoStatus.PENDENTE);
    solicitacaoRepository.listar.mockResolvedValueOnce(pendentes);

    const result = await usecase.execute({ status: solicitacaoStatus.PENDENTE });

    expect(solicitacaoRepository.listar).toHaveBeenCalledWith({
      status: solicitacaoStatus.PENDENTE,
      relations: true,
    });
    expect(result.solicitacoes).toHaveLength(1);
    expect(result.solicitacoes[0].status).toBe(solicitacaoStatus.PENDENTE);
    expect(result.solicitacoes[0].nomeCompleto).toBe(usuarioMedico1.nomeCompleto);
    expect(result.solicitacoes[0].email).toBe(usuarioMedico1.email);
  });

  it('deve listar solicitacoes de um usuario especifico', async () => {
    const doMedico = solicitacoes.filter((s) => s.idUsuario === usuarioMedico1.id);
    solicitacaoRepository.listar.mockResolvedValueOnce(doMedico);

    const result = await usecase.execute({ idUsuario: usuarioMedico1.id });

    expect(solicitacaoRepository.listar).toHaveBeenCalledWith({
      idUsuario: usuarioMedico1.id,
      relations: true,
    });
    expect(result.solicitacoes).toHaveLength(1);
    expect(result.solicitacoes[0].idUsuario).toBe(usuarioMedico1.id);
    expect(result.solicitacoes[0].nomeCompleto).toBe(usuarioMedico1.nomeCompleto);
  });

  it('deve retornar lista vazia quando nao houver solicitacoes', async () => {
    solicitacaoRepository.listar.mockResolvedValueOnce([]);

    const result = await usecase.execute();

    expect(result.solicitacoes).toHaveLength(0);
  });
});
