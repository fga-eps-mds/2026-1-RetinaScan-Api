import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { RevokeExamShareUseCase } from '@/modules/exam/use-cases/revoke-exam-share-usecase';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import type { ExamShareRepository, ExamesRepository } from '@/modules/exam';
import { NotFoundError, UnauthorizedError } from '@/shared/errors';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';

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

class FakeExamesRepository implements ExamesRepository {
  create = vi.fn();
  createWithComorbidity = vi.fn();
  findOne = vi.fn();
  findMany = vi.fn();
  update = vi.fn();
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
let examRepo: FakeExamesRepository;
let shareRepo: FakeExamShareRepository;
let usecase: RevokeExamShareUseCase;

describe('RevokeExamShareUseCase', () => {
  beforeEach(() => {
    userRepo = new FakeUsuariosRepository();
    examRepo = new FakeExamesRepository();
    shareRepo = new FakeExamShareRepository();
    usecase = new RevokeExamShareUseCase(shareRepo, examRepo, userRepo);
  });

  it('deve permitir que o dono do exame revogue o acesso', async () => {
    const medicoDono = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    const exam = ExameBuilder.anExame().withIdUsuario(medicoDono.id).getData();
    const shareId = faker.string.uuid();

    shareRepo.findById.mockResolvedValue({
      id: shareId,
      examId: exam.id,
      medicoDestinoId: faker.string.uuid(),
      compartilhadoPor: medicoDono.id,
      ativo: true,
      expiraEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findBy.mockResolvedValue(medicoDono);
    shareRepo.revoke.mockResolvedValue(undefined);

    await expect(
      usecase.execute({ shareId, requesterId: medicoDono.id })
    ).resolves.toBeUndefined();

    expect(shareRepo.revoke).toHaveBeenCalledWith(shareId);
  });

  it('deve permitir que um ESPECIALISTA revogue o acesso (mesmo não sendo dono)', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const exam = ExameBuilder.anExame().withIdUsuario(faker.string.uuid()).getData();
    const shareId = faker.string.uuid();

    shareRepo.findById.mockResolvedValue({
      id: shareId,
      examId: exam.id,
      medicoDestinoId: faker.string.uuid(),
      compartilhadoPor: faker.string.uuid(),
      ativo: true,
      expiraEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findBy.mockResolvedValue(especialista);
    shareRepo.revoke.mockResolvedValue(undefined);

    await expect(
      usecase.execute({ shareId, requesterId: especialista.id })
    ).resolves.toBeUndefined();

    expect(shareRepo.revoke).toHaveBeenCalledWith(shareId);
  });

  it('deve lançar NotFoundError se o compartilhamento não existir', async () => {
    shareRepo.findById.mockResolvedValue(null);

    await expect(
      usecase.execute({ shareId: faker.string.uuid(), requesterId: faker.string.uuid() })
    ).rejects.toThrow(NotFoundError);
  });

  it('deve lançar NotFoundError se o exame não existir', async () => {
    shareRepo.findById.mockResolvedValue({
      id: faker.string.uuid(),
      examId: faker.string.uuid(),
      medicoDestinoId: faker.string.uuid(),
      compartilhadoPor: faker.string.uuid(),
      ativo: true,
      expiraEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    examRepo.findOne.mockResolvedValue(null);

    await expect(
      usecase.execute({ shareId: faker.string.uuid(), requesterId: faker.string.uuid() })
    ).rejects.toThrow(NotFoundError);
  });

  it('deve lançar UnauthorizedError se um MEDICO tentar revogar exame de outro', async () => {
    const medicoHacker = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    const exam = ExameBuilder.anExame().withIdUsuario(faker.string.uuid()).getData();
    const shareId = faker.string.uuid();

    shareRepo.findById.mockResolvedValue({
      id: shareId,
      examId: exam.id,
      medicoDestinoId: faker.string.uuid(),
      compartilhadoPor: faker.string.uuid(),
      ativo: true,
      expiraEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findBy.mockResolvedValue(medicoHacker);

    await expect(
      usecase.execute({ shareId, requesterId: medicoHacker.id })
    ).rejects.toThrow(UnauthorizedError);
    
    expect(shareRepo.revoke).not.toHaveBeenCalled();
  });

  it('deve lançar ConflictError se o acesso já estiver revogado (ativo = false)', async () => {
    const shareId = faker.string.uuid();

    shareRepo.findById.mockResolvedValue({
      id: shareId,
      examId: faker.string.uuid(),
      medicoDestinoId: faker.string.uuid(),
      compartilhadoPor: faker.string.uuid(),
      ativo: false,
      expiraEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      usecase.execute({ shareId, requesterId: faker.string.uuid() })
    ).rejects.toThrow('Este acesso já foi revogado anteriormente.');
  });
});
