import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  solicitacaoStatus,
  statusUsuario,
  tiposPerfil,
  type SolicitacaoCpfCrm,
  type Usuario,
} from '@/modules/users/domain';
import type { SolicitacaoCpfCrmRepository, UsuariosRepository } from '@/modules/users/repositories';
import { AprovarSolicitacaoCpfCrmUsecase } from '@/modules/users/use-cases';
import { NotFoundError } from '@/shared/errors';
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

describe('AprovarSolicitacaoCpfCrmUsecase', () => {
  let usuariosRepository: FakeUsuariosRepository;
  let solicitacaoRepository: FakeSolicitacaoCpfCrmRepository;
  let usecase: AprovarSolicitacaoCpfCrmUsecase;

  const admin: Usuario = UsuarioBuilder.anUser()
    .withTipoPerfil(tiposPerfil.ADMIN)
    .withStatus(statusUsuario.ATIVO)
    .getData();

  const solicitacao: SolicitacaoCpfCrm = {
    id: 'sol-1',
    idUsuario: 'medico-1',
    cpfNovo: '52998224725',
    crmNovo: 'CRM-9876',
    status: solicitacaoStatus.APROVADA,
    motivoRejeicao: null,
    analisadoPor: admin.id,
    analisadoEm: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    usuariosRepository = new FakeUsuariosRepository();
    solicitacaoRepository = new FakeSolicitacaoCpfCrmRepository();

    usecase = new AprovarSolicitacaoCpfCrmUsecase(usuariosRepository, solicitacaoRepository);
  });

  it('deve aprovar solicitacao e aplicar cpf/crm no usuario', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(admin);
    solicitacaoRepository.aprovar.mockResolvedValueOnce(solicitacao);
    usuariosRepository.update.mockResolvedValueOnce({ id: solicitacao.idUsuario });

    const result = await usecase.execute({
      idSolicitacao: solicitacao.id,
      idAdmin: admin.id,
    });

    expect(solicitacaoRepository.aprovar).toHaveBeenCalledWith({
      idSolicitacao: solicitacao.id,
      analisadoPor: admin.id,
    });
    expect(usuariosRepository.update).toHaveBeenCalledWith(solicitacao.idUsuario, {
      cpf: solicitacao.cpfNovo,
      crm: solicitacao.crmNovo,
    });
    expect(result.solicitacao).toEqual(solicitacao);
    expect(result.notificacaoEnviada).toBe(true);
  });

  it('deve lançar NotFoundError quando admin não existir', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        idSolicitacao: 'sol-1',
        idAdmin: 'admin-inexistente',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deve lançar UnauthorizedError quando usuário não for admin', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce({ ...admin, tipoPerfil: tiposPerfil.MEDICO });

    await expect(
      usecase.execute({
        idSolicitacao: 'sol-1',
        idAdmin: admin.id,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('deve lançar NotFoundError quando solicitação não existir', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(admin);
    solicitacaoRepository.aprovar.mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        idSolicitacao: 'sol-inexistente',
        idAdmin: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deve lançar NotFoundError quando usuário da solicitação não existir', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(admin);
    solicitacaoRepository.aprovar.mockResolvedValueOnce(solicitacao);
    usuariosRepository.update.mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        idSolicitacao: solicitacao.id,
        idAdmin: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
