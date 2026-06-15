import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { ShareExamUseCase } from '@/modules/exam/use-cases/share-exam-usecase';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import type { ExamesRepository, ExamShareRepository } from '@/modules/exam';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';
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
  revoke = vi.fn();
}

let userRepo: FakeUsuariosRepository;
let examRepo: FakeExamesRepository;
let shareRepo: FakeExamShareRepository;
let usecase: ShareExamUseCase;

describe('ShareExamUseCase', () => {
  beforeEach(() => {
    userRepo = new FakeUsuariosRepository();
    examRepo = new FakeExamesRepository();
    shareRepo = new FakeExamShareRepository();
    usecase = new ShareExamUseCase(examRepo, userRepo, shareRepo);
  });

  it('deve compartilhar um exame com sucesso', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const medico = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    const exam = ExameBuilder.anExame().withIdUsuario(especialista.id).getData();

    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findByEmail.mockResolvedValue(medico);
    shareRepo.findByExamAndMedico.mockResolvedValue(null);
    shareRepo.create.mockResolvedValue({
      id: faker.string.uuid(),
      examId: exam.id,
      medicoDestinoId: medico.id,
      compartilhadoPor: especialista.id,
      expiraEm: null,
      ativo: true,
      criadoEm: new Date(),
    });

    const result = await usecase.execute({
      examId: exam.id,
      emailDestino: medico.email,
      compartilhadoPorId: especialista.id,
    });

    expect(result).toBeDefined();
    expect(shareRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        examId: exam.id,
        medicoDestinoId: medico.id,
        compartilhadoPor: especialista.id,
        expiraEm: undefined,
      }),
    );
  });

  it('deve lançar erro se usuário que tenta compartilhar não for encontrado', async () => {
    userRepo.findBy.mockResolvedValue(null);

    await expect(
      usecase.execute({
        examId: faker.string.uuid(),
        emailDestino: faker.internet.email(),
        compartilhadoPorId: faker.string.uuid(),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('deve lançar erro se usuário que tenta compartilhar não for ESPECIALISTA', async () => {
    const admin = UsuarioBuilder.anUser().withTipoPerfil('ADMIN').getData();
    userRepo.findBy.mockResolvedValue(admin);

    await expect(
      usecase.execute({
        examId: faker.string.uuid(),
        emailDestino: faker.internet.email(),
        compartilhadoPorId: admin.id,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('deve lançar erro se o exame não for encontrado', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(null);

    await expect(
      usecase.execute({
        examId: faker.string.uuid(),
        emailDestino: faker.internet.email(),
        compartilhadoPorId: especialista.id,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('deve lançar erro se emailDestino não for informado', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const exam = ExameBuilder.anExame().getData();

    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(exam);

    await expect(
      usecase.execute({
        examId: exam.id,
        emailDestino: '',
        compartilhadoPorId: especialista.id,
      }),
    ).rejects.toThrowError('É necessário informar o E-mail ou CRM do médico destino.');
  });

  it('deve lançar erro se o médico destino não for encontrado', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const exam = ExameBuilder.anExame().getData();

    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findByEmail.mockResolvedValue(null);

    await expect(
      usecase.execute({
        examId: exam.id,
        emailDestino: faker.internet.email(),
        compartilhadoPorId: especialista.id,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('deve lançar erro se o usuário destino não for do perfil MEDICO', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const admin = UsuarioBuilder.anUser().withTipoPerfil('ADMIN').getData();
    const exam = ExameBuilder.anExame().getData();

    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findByEmail.mockResolvedValue(admin);

    await expect(
      usecase.execute({
        examId: exam.id,
        emailDestino: admin.email,
        compartilhadoPorId: especialista.id,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('deve lançar erro se tentar compartilhar com o próprio dono do exame', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const medicoDono = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    const exam = ExameBuilder.anExame().withIdUsuario(medicoDono.id).getData();

    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findByEmail.mockResolvedValue(medicoDono);

    await expect(
      usecase.execute({
        examId: exam.id,
        emailDestino: medicoDono.email,
        compartilhadoPorId: especialista.id,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('deve lançar erro se a data de expiração for no passado', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const medico = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    const exam = ExameBuilder.anExame().getData();

    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findByEmail.mockResolvedValue(medico);

    const dataNoPassado = new Date();
    dataNoPassado.setDate(dataNoPassado.getDate() - 1);

    await expect(
      usecase.execute({
        examId: exam.id,
        emailDestino: medico.email,
        compartilhadoPorId: especialista.id,
        expiraEm: dataNoPassado,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('deve lançar erro se já existir um compartilhamento ativo e válido para este médico', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const medico = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    const exam = ExameBuilder.anExame().getData();

    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findByEmail.mockResolvedValue(medico);
    shareRepo.findByExamAndMedico.mockResolvedValue({
      id: faker.string.uuid(),
      examId: exam.id,
      medicoDestinoId: medico.id,
      compartilhadoPor: especialista.id,
      expiraEm: null,
      ativo: true,
      criadoEm: new Date(),
    });

    await expect(
      usecase.execute({
        examId: exam.id,
        emailDestino: medico.email,
        compartilhadoPorId: especialista.id,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('deve permitir criar um novo compartilhamento se o existente estiver expirado', async () => {
    const especialista = UsuarioBuilder.anUser().withTipoPerfil('ESPECIALISTA').getData();
    const medico = UsuarioBuilder.anUser().withTipoPerfil('MEDICO').getData();
    const exam = ExameBuilder.anExame().withIdUsuario(especialista.id).getData();

    const dataNoPassado = new Date();
    dataNoPassado.setDate(dataNoPassado.getDate() - 1);

    userRepo.findBy.mockResolvedValue(especialista);
    examRepo.findOne.mockResolvedValue(exam);
    userRepo.findByEmail.mockResolvedValue(medico);
    shareRepo.findByExamAndMedico.mockResolvedValue({
      id: faker.string.uuid(),
      examId: exam.id,
      medicoDestinoId: medico.id,
      compartilhadoPor: especialista.id,
      expiraEm: dataNoPassado, // expirado
      ativo: true,
      criadoEm: new Date(),
    });

    shareRepo.create.mockResolvedValue({
      id: faker.string.uuid(),
      examId: exam.id,
      medicoDestinoId: medico.id,
      compartilhadoPor: especialista.id,
      expiraEm: null,
      ativo: true,
      criadoEm: new Date(),
    });

    const result = await usecase.execute({
      examId: exam.id,
      emailDestino: medico.email,
      compartilhadoPorId: especialista.id,
    });

    expect(result).toBeDefined();
    expect(shareRepo.create).toHaveBeenCalled();
  });
});
