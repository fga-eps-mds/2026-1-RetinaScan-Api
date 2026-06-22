import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { ListMySharesUseCase } from '@/modules/exam/use-cases/list-my-shares-usecase';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import type { ExamShareRepository } from '@/modules/exam';
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

class FakeExamShareRepository implements ExamShareRepository {
  create = vi.fn();
  findById = vi.fn();
  findByExamAndMedico = vi.fn();
  listActiveByExam = vi.fn();
  listActiveByCompartilhadoPor = vi.fn();
  revoke = vi.fn();
}

let userRepo: FakeUsuariosRepository;
let shareRepo: FakeExamShareRepository;
let usecase: ListMySharesUseCase;

describe('ListMySharesUseCase', () => {
  beforeEach(() => {
    userRepo = new FakeUsuariosRepository();
    shareRepo = new FakeExamShareRepository();
    usecase = new ListMySharesUseCase(shareRepo, userRepo);
  });

  it('deve listar os compartilhamentos globais criados por um médico', async () => {
    const compartilhadoPorId = faker.string.uuid();
    const medico = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    
    shareRepo.listActiveByCompartilhadoPor.mockResolvedValue([
      {
        id: faker.string.uuid(),
        examId: faker.string.uuid(),
        medicoDestinoId: medico.id,
        compartilhadoPor: compartilhadoPorId,
        ativo: true,
        expiraEm: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);

    userRepo.findBy.mockResolvedValue(medico);

    const result = await usecase.execute({ compartilhadoPorId });

    expect(result).toHaveLength(1);
    expect(result[0].medicoDestino.nomeCompleto).toBe(medico.nomeCompleto);
    expect(shareRepo.listActiveByCompartilhadoPor).toHaveBeenCalledWith(compartilhadoPorId);
    expect(userRepo.findBy).toHaveBeenCalledWith({ id: medico.id });
  });

  it('deve retornar "Desconhecido" caso o médico de destino não seja encontrado', async () => {
    const compartilhadoPorId = faker.string.uuid();
    
    shareRepo.listActiveByCompartilhadoPor.mockResolvedValue([
      {
        id: faker.string.uuid(),
        examId: faker.string.uuid(),
        medicoDestinoId: faker.string.uuid(),
        compartilhadoPor: compartilhadoPorId,
        ativo: true,
        expiraEm: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);

    userRepo.findBy.mockResolvedValue(null);

    const result = await usecase.execute({ compartilhadoPorId });

    expect(result).toHaveLength(1);
    expect(result[0].medicoDestino.nomeCompleto).toBe('Desconhecido');
  });

  it('deve retornar array vazio se não houver compartilhamentos ativos', async () => {
    shareRepo.listActiveByCompartilhadoPor.mockResolvedValue([]);

    const result = await usecase.execute({ compartilhadoPorId: faker.string.uuid() });

    expect(result).toHaveLength(0);
  });
});
