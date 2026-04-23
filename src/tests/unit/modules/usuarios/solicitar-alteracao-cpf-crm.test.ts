import { beforeEach, describe, expect, it, vi } from 'vitest';
import { solicitacaoStatus, statusUsuario, tiposPerfil, type SolicitacaoCpfCrm, type Usuario } from '@/modules/users/domain';
import type {
  SolicitacaoCpfCrmRepository,
  SolicitarAlteracaoCpfCrmInput,
  UsuariosRepository,
} from '@/modules/users/repositories';
import { SolicitarAlteracaoCpfCrmUsecase } from '@/modules/users/use-cases';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { ConflictError } from '@/shared/errors/conflict-error';
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

describe('SolicitarAlteracaoCpfCrmUsecase', () => {
  let usuariosRepository: FakeUsuariosRepository;
  let solicitacaoRepository: FakeSolicitacaoCpfCrmRepository;
  let usecase: SolicitarAlteracaoCpfCrmUsecase;

  const medico: Usuario = UsuarioBuilder.anUser()
    .withTipoPerfil(tiposPerfil.MEDICO)
    .withStatus(statusUsuario.ATIVO)
    .getData();

  const solicitacaoCriada: SolicitacaoCpfCrm = {
    id: 'sol-1',
    idUsuario: medico.id,
    cpfNovo: '52998224725',
    crmNovo: 'CRM-1234',
    status: solicitacaoStatus.PENDENTE,
    motivoRejeicao: null,
    analisadoPor: null,
    analisadoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    usuariosRepository = new FakeUsuariosRepository();
    solicitacaoRepository = new FakeSolicitacaoCpfCrmRepository();

    usecase = new SolicitarAlteracaoCpfCrmUsecase(usuariosRepository, solicitacaoRepository);
  });

  it('deve criar solicitacao quando dados forem validos', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(medico);
    solicitacaoRepository.findPendenteByUsuario.mockResolvedValueOnce(null);
    usuariosRepository.findByCpf.mockResolvedValueOnce(null);
    usuariosRepository.findByCrm.mockResolvedValueOnce(null);
    solicitacaoRepository.criar.mockResolvedValueOnce(solicitacaoCriada);

    const input: SolicitarAlteracaoCpfCrmInput = {
      idUsuario: medico.id,
      cpfNovo: '529.982.247-25',
      crmNovo: 'CRM-1234',
    };

    const result = await usecase.execute(input);

    expect(solicitacaoRepository.criar).toHaveBeenCalledWith({
      idUsuario: medico.id,
      cpfNovo: '52998224725',
      crmNovo: 'CRM-1234',
    });
    expect(result).toEqual({ idSolicitacao: 'sol-1', status: solicitacaoStatus.PENDENTE });
  });

  it('deve lançar ValidationError para cpf invalido', async () => {
    await expect(
      usecase.execute({
        idUsuario: medico.id,
        cpfNovo: '11111111111',
        crmNovo: 'CRM-1234',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('deve lançar ValidationError para crm invalido', async () => {
    await expect(
      usecase.execute({
        idUsuario: medico.id,
        cpfNovo: '52998224725',
        crmNovo: '**',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('deve lançar NotFoundError quando usuario nao existir', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(null);

    await expect(
      usecase.execute({
        idUsuario: 'user-nao-existe',
        cpfNovo: '52998224725',
        crmNovo: 'CRM-1234',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deve impedir solicitacao para perfil nao medico', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce({ ...medico, tipoPerfil: tiposPerfil.ADMIN });

    await expect(
      usecase.execute({
        idUsuario: medico.id,
        cpfNovo: '52998224725',
        crmNovo: 'CRM-1234',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('deve lançar ConflictError quando ja existir solicitacao pendente', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(medico);
    solicitacaoRepository.findPendenteByUsuario.mockResolvedValueOnce(solicitacaoCriada);

    await expect(
      usecase.execute({
        idUsuario: medico.id,
        cpfNovo: '52998224725',
        crmNovo: 'CRM-1234',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('deve lançar ConflictError quando cpf ja pertencer a outro usuario', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(medico);
    solicitacaoRepository.findPendenteByUsuario.mockResolvedValueOnce(null);
    usuariosRepository.findByCpf.mockResolvedValueOnce({ ...medico, id: 'outro-user' });

    await expect(
      usecase.execute({
        idUsuario: medico.id,
        cpfNovo: '52998224725',
        crmNovo: 'CRM-1234',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('deve lançar ConflictError quando crm ja pertencer a outro usuario', async () => {
    usuariosRepository.findBy.mockResolvedValueOnce(medico);
    solicitacaoRepository.findPendenteByUsuario.mockResolvedValueOnce(null);
    usuariosRepository.findByCpf.mockResolvedValueOnce(null);
    usuariosRepository.findByCrm.mockResolvedValueOnce({ ...medico, id: 'outro-user' });

    await expect(
      usecase.execute({
        idUsuario: medico.id,
        cpfNovo: '52998224725',
        crmNovo: 'CRM-1234',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
