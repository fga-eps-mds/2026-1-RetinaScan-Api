import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  solicitacaoStatus,
  statusUsuario,
  tiposPerfil,
  type SolicitacaoCpfCrm,
  type Usuario,
} from '@/modules/users/domain';
import type { SolicitacaoCpfCrmRepository, UsuariosRepository } from '@/modules/users/repositories';
import { RejeitarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { UnauthorizedError } from '@/shared/errors/unauthorized-error';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

class FakeUsuariosRepository implements UsuariosRepository {
  findByEmail = vi.fn();
  findByCpf = vi.fn();
  findByCrm = vi.fn();
  findBy = vi.fn();
  getAllUsers = vi.fn();
  update = vi.fn();
}

class FakeSolicitacaoCpfCrmRepository implements SolicitacaoCpfCrmRepository {
  criar = vi.fn();
  findPendenteByUsuario = vi.fn();
  listar = vi.fn();
  aprovar = vi.fn();
  rejeitar = vi.fn();
}

describe('RejeitarSolicitacaoCpfCrmUsecase', () => {
  let usuariosRepository: FakeUsuariosRepository;
  let solicitacaoRepository: FakeSolicitacaoCpfCrmRepository;
  let usecase: RejeitarSolicitacaoCpfCrmUsecase;

  const admin: Usuario = UsuarioBuilder.anUser()
    .withTipoPerfil(tiposPerfil.ADMIN)
    .withStatus(statusUsuario.ATIVO)
    .getData();

  const solicitacao: SolicitacaoCpfCrm = {
    id: 'sol-1',
    idUsuario: 'medico-1',
    cpfNovo: '52998224725',
    crmNovo: 'CRM-9876',
    status: solicitacaoStatus.REJEITADA,
    motivoRejeicao: 'Dados divergentes',
    analisadoPor: admin.id,
    analisadoEm: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    usuariosRepository = new FakeUsuariosRepository();
    solicitacaoRepository = new FakeSolicitacaoCpfCrmRepository();

    usecase = new RejeitarSolicitacaoCpfCrmUsecase(usuariosRepository, solicitacaoRepository);
  });

  it('deve rejeitar solicitacao com motivo', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(admin);
    solicitacaoRepository.rejeitar.mockResolvedValueOnce(solicitacao);

    const result = await usecase.execute({
      idSolicitacao: solicitacao.id,
      idAdmin: admin.id,
      motivoRejeicao: 'Dados divergentes',
    });

    expect(solicitacaoRepository.rejeitar).toHaveBeenCalledWith({
      idSolicitacao: solicitacao.id,
      analisadoPor: admin.id,
      motivoRejeicao: 'Dados divergentes',
    });
    expect(result.solicitacao).toEqual(solicitacao);
  });

  it('deve lançar ValidationError quando motivo for vazio', async () => {
    await expect(
      usecase.execute({
        idSolicitacao: 'sol-1',
        idAdmin: admin.id,
        motivoRejeicao: '   ',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('deve lançar NotFoundError quando admin não existir', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        idSolicitacao: 'sol-1',
        idAdmin: 'admin-inexistente',
        motivoRejeicao: 'Dados divergentes',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deve lançar UnauthorizedError quando usuário não for admin', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce({ ...admin, tipoPerfil: tiposPerfil.MEDICO });

    await expect(
      usecase.execute({
        idSolicitacao: 'sol-1',
        idAdmin: admin.id,
        motivoRejeicao: 'Dados divergentes',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('deve lançar NotFoundError quando solicitação não existir', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(admin);
    solicitacaoRepository.rejeitar.mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        idSolicitacao: 'sol-inexistente',
        idAdmin: admin.id,
        motivoRejeicao: 'Dados divergentes',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
