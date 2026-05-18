import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import type { ExamesRepository } from '@/modules/exam/exam-repository';
import { ExameStatus } from '@/modules/exam/exam';
import { CreateExamUseCase } from '@/modules/exam/use-cases/create-exam-usecase';
import { NotFoundError } from '@/shared/errors';
import type { CryptographyService } from '@/shared/services';
import { UsuarioBuilder } from '@/tests/helpers/builders/usuario-builder';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';

class FakeUsuariosRepository implements UsuariosRepository {
  findByEmail = vi.fn();
  findByCpf = vi.fn();
  findByCrm = vi.fn();
  findBy = vi.fn();
  getAllUsers = vi.fn();
  update = vi.fn();
}

class FakeExamesRepository implements ExamesRepository {
  create = vi.fn();
  createWithComorbidity = vi.fn();
  findOne = vi.fn();
  findMany = vi.fn();
  update = vi.fn();
}

class FakeCryptographyService implements CryptographyService {
  encrypt = vi.fn(({ text }: { text: string }) => ({
    encryptedText: `enc(${text})`,
  }));
  decrypt = vi.fn();
}

let userRepository: FakeUsuariosRepository;
let examRepository: FakeExamesRepository;
let cryptographyService: FakeCryptographyService;
let usecase: CreateExamUseCase;

describe('CreateExamUseCase', () => {
  beforeEach(() => {
    userRepository = new FakeUsuariosRepository();
    examRepository = new FakeExamesRepository();
    cryptographyService = new FakeCryptographyService();
    usecase = new CreateExamUseCase(userRepository, examRepository, cryptographyService);

    vi.clearAllMocks();
  });

  it('should create an exam encrypting sensitive data without masking the name or cpf', async () => {
    const usuario = UsuarioBuilder.anUser().getData();
    const exame = ExameBuilder.anExame().withIdUsuario(usuario.id).getData();
    const outrasComorbidadesDescricao = faker.lorem.words(3);
    const descricao = faker.lorem.sentence();

    const comorbidades = {
      diabetes: true,
      diabetesAnos: 10,
      diabetesUsoInsulina: true,
      diabetesControlado: false,
      hipertensao: true,
      hipertensaoControlada: true,
      altaMiopia: false,
      glaucoma: true,
      usoHidroxicloroquina: false,
      uveite: false,
      catarata: true,
      outrasComorbidades: true,
      outrasComorbidadesDescricao,
      qualidadeTecnicaDificuldade: false,
    };

    userRepository.findBy.mockResolvedValue(usuario);
    examRepository.createWithComorbidity.mockImplementation(async ({ exam }) => exam);

    const result = await usecase.execute({
      idUsuario: usuario.id,
      nomeCompleto: exame.nomeCompleto,
      cpf: exame.cpf,
      sexo: exame.sexo,
      dtNascimento: exame.dtNascimento,
      dtHora: exame.dtHora,
      comorbidades,
      descricao,
    });

    expect(userRepository.findBy).toHaveBeenCalledWith({ id: usuario.id });
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({
      text: exame.dtNascimento,
    });
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({
      text: descricao,
    });
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({
      text: outrasComorbidadesDescricao,
    });

    expect(examRepository.createWithComorbidity).toHaveBeenCalledWith(
      expect.objectContaining({
        exam: expect.objectContaining({
          idUsuario: usuario.id,
          nomeCompleto: exame.nomeCompleto,
          cpf: exame.cpf,
          sexo: exame.sexo,
          dtNascimento: `enc(${exame.dtNascimento})`,
          dtHora: exame.dtHora,
          status: ExameStatus.CRIADO,
          descricao: `enc(${descricao})`,
        }),
        comorbidades: expect.objectContaining({
          diabetes: true,
          diabetesAnos: 10,
          diabetesUsoInsulina: true,
          diabetesControlado: false,
          hipertensao: true,
          hipertensaoControlada: true,
          altaMiopia: false,
          glaucoma: true,
          usoHidroxicloroquina: false,
          uveite: false,
          catarata: true,
          outrasComorbidades: true,
          outrasComorbidadesDescricao: `enc(${outrasComorbidadesDescricao})`,
          qualidadeTecnicaDificuldade: false,
        }),
      }),
    );

    expect(result.nomeCompleto).toBe(exame.nomeCompleto);
    expect(result.cpf).toBe(exame.cpf);
  });

  it('should not encrypt optional fields when not provided', async () => {
    const usuario = UsuarioBuilder.anUser().getData();
    const exame = ExameBuilder.anExame().withIdUsuario(usuario.id).getData();

    userRepository.findBy.mockResolvedValue(usuario);
    examRepository.createWithComorbidity.mockImplementation(async ({ exam }) => exam);

    await usecase.execute({
      idUsuario: usuario.id,
      nomeCompleto: exame.nomeCompleto,
      cpf: exame.cpf,
      sexo: exame.sexo,
      dtNascimento: exame.dtNascimento,
      dtHora: exame.dtHora,
      comorbidades: {
        diabetes: false,
        diabetesUsoInsulina: false,
        diabetesControlado: false,
        hipertensao: false,
        hipertensaoControlada: false,
        altaMiopia: false,
        glaucoma: false,
        usoHidroxicloroquina: false,
        uveite: false,
        catarata: false,
        outrasComorbidades: false,
        qualidadeTecnicaDificuldade: false,
      },
    });

    expect(cryptographyService.encrypt).toHaveBeenCalledTimes(1);
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({
      text: exame.dtNascimento,
    });

    expect(examRepository.createWithComorbidity).toHaveBeenCalledWith(
      expect.objectContaining({
        exam: expect.objectContaining({
          descricao: undefined,
          status: ExameStatus.CRIADO,
        }),
        comorbidades: expect.objectContaining({
          outrasComorbidades: false,
          outrasComorbidadesDescricao: undefined,
        }),
      }),
    );
  });

  it('should generate a new id for the exam', async () => {
    const usuario = UsuarioBuilder.anUser().getData();
    const exame = ExameBuilder.anExame().withIdUsuario(usuario.id).getData();

    userRepository.findBy.mockResolvedValue(usuario);
    examRepository.createWithComorbidity.mockImplementation(async ({ exam }) => exam);

    await usecase.execute({
      idUsuario: usuario.id,
      nomeCompleto: exame.nomeCompleto,
      cpf: exame.cpf,
      sexo: exame.sexo,
      dtNascimento: exame.dtNascimento,
      dtHora: exame.dtHora,
      comorbidades: {
        diabetes: false,
        diabetesUsoInsulina: false,
        diabetesControlado: false,
        hipertensao: false,
        hipertensaoControlada: false,
        altaMiopia: false,
        glaucoma: false,
        usoHidroxicloroquina: false,
        uveite: false,
        catarata: false,
        outrasComorbidades: false,
        qualidadeTecnicaDificuldade: false,
      },
    });

    const [arg] = examRepository.createWithComorbidity.mock.calls[0];

    expect(arg.exam.id).toEqual(expect.any(String));
    expect(arg.exam.id).toHaveLength(36);
    expect(arg.comorbidades.idExame).toBe(arg.exam.id);
  });

  it('should throw NotFoundError when user does not exist', async () => {
    const exame = ExameBuilder.anExame().getData();

    userRepository.findBy.mockResolvedValue(null);

    await expect(
      usecase.execute({
        idUsuario: faker.string.uuid(),
        nomeCompleto: exame.nomeCompleto,
        cpf: exame.cpf,
        sexo: exame.sexo,
        dtNascimento: exame.dtNascimento,
        dtHora: exame.dtHora,
        comorbidades: {
          diabetes: false,
          diabetesUsoInsulina: false,
          diabetesControlado: false,
          hipertensao: false,
          hipertensaoControlada: false,
          altaMiopia: false,
          glaucoma: false,
          usoHidroxicloroquina: false,
          uveite: false,
          catarata: false,
          outrasComorbidades: false,
          qualidadeTecnicaDificuldade: false,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(examRepository.createWithComorbidity).not.toHaveBeenCalled();
    expect(cryptographyService.encrypt).not.toHaveBeenCalled();
  });
});
