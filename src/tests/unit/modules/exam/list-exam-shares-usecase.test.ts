import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { ListExamSharesUseCase } from '@/modules/exam/use-cases/list-exam-shares-usecase';
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
let usecase: ListExamSharesUseCase;

describe('ListExamSharesUseCase', () => {
  beforeEach(() => {
    userRepo = new FakeUsuariosRepository();
    shareRepo = new FakeExamShareRepository();
    usecase = new ListExamSharesUseCase(shareRepo, userRepo);
  });

  it('deve listar os compartilhamentos de um exame', async () => {
    const examId = faker.string.uuid();
    const medico = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    
    shareRepo.listActiveByExam.mockResolvedValue([
      {
        id: faker.string.uuid(),
        examId,
        medicoDestinoId: medico.id,
        compartilhadoPor: faker.string.uuid(),
        ativo: true,
        expiraEm: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);

    userRepo.findBy.mockResolvedValue(medico);

    const result = await usecase.execute({ examId });

    expect(result).toHaveLength(1);
    expect(result[0].medicoDestino.nomeCompleto).toBe(medico.nomeCompleto);
    expect(result[0].medicoDestino.email).toBe(medico.email);
    expect(shareRepo.listActiveByExam).toHaveBeenCalledWith(examId);
    expect(userRepo.findBy).toHaveBeenCalledWith({ id: medico.id });
  });

  it('deve retornar "Desconhecido" caso o médico não seja encontrado', async () => {
    const examId = faker.string.uuid();
    
    shareRepo.listActiveByExam.mockResolvedValue([
      {
        id: faker.string.uuid(),
        examId,
        medicoDestinoId: faker.string.uuid(),
        compartilhadoPor: faker.string.uuid(),
        ativo: true,
        expiraEm: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);

    userRepo.findBy.mockResolvedValue(null);

    const result = await usecase.execute({ examId });

    expect(result).toHaveLength(1);
    expect(result[0].medicoDestino.nomeCompleto).toBe('Desconhecido');
    expect(result[0].medicoDestino.email).toBe('Desconhecido');
  });

  it('deve retornar array vazio se o exame não tiver compartilhamentos', async () => {
    shareRepo.listActiveByExam.mockResolvedValue([]);

    const result = await usecase.execute({ examId: faker.string.uuid() });

    expect(result).toHaveLength(0);
  });
});
