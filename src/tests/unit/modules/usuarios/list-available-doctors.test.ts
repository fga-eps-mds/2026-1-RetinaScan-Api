import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { ListAvailableDoctorsUseCase } from '@/modules/users/use-cases/list-available-doctors';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';

class FakeUsuariosRepository implements UsuariosRepository {
  findByEmail = vi.fn();
  findByCpf = vi.fn();
  findByCrm = vi.fn();
  findBy = vi.fn();
  getAllUsers = vi.fn();
  update = vi.fn();
  updatePassword = vi.fn();
  searchAvailableDoctors = vi.fn();
}

let userRepo: FakeUsuariosRepository;
let usecase: ListAvailableDoctorsUseCase;

describe('ListAvailableDoctorsUseCase', () => {
  beforeEach(() => {
    userRepo = new FakeUsuariosRepository();
    usecase = new ListAvailableDoctorsUseCase(userRepo);
  });

  it('deve listar os médicos omitindo dados sensíveis (cpf, senha, crm)', async () => {
    const medico = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    
    userRepo.searchAvailableDoctors.mockResolvedValue([medico]);

    const result = await usecase.execute();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: medico.id,
      nomeCompleto: medico.nomeCompleto,
      email: medico.email,
    });
    
    // Garantir que os dados sensíveis não estão vazando
    expect((result[0] as any).cpf).toBeUndefined();
    expect((result[0] as any).crm).toBeUndefined();
    expect((result[0] as any).password).toBeUndefined();

    expect(userRepo.searchAvailableDoctors).toHaveBeenCalledWith(undefined);
  });

  it('deve passar o termo de busca para o repositório', async () => {
    userRepo.searchAvailableDoctors.mockResolvedValue([]);

    const termoBusca = 'joao';
    await usecase.execute(termoBusca);

    expect(userRepo.searchAvailableDoctors).toHaveBeenCalledWith(termoBusca);
  });

  it('deve retornar array vazio se não encontrar médicos', async () => {
    userRepo.searchAvailableDoctors.mockResolvedValue([]);

    const result = await usecase.execute();

    expect(result).toHaveLength(0);
  });
});
