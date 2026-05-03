import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import type { ExamesRepository } from '@/modules/exam/exam-repository';
import { ExameStatus } from '@/modules/exam/exam';
import { CreateExamUseCase } from '@/modules/exam/use-cases/create-exam-usecase';
import { NotFoundError } from '@/shared/errors';
import type { CryptographyService, MaskingService } from '@/shared/services';
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
  findOne = vi.fn();
}

class FakeCryptographyService implements CryptographyService {
  encrypt = vi.fn(({ text }: { text: string }) => ({ encryptedText: `enc(${text})` }));
  decrypt = vi.fn();
}

class FakeMaskingService implements MaskingService {
  maskEmail = vi.fn();
  maskName = vi.fn((name: string) => `masked-name(${name})`);
  maskCpf = vi.fn((cpf: string) => `masked(${cpf})`);
}

let userRepository: FakeUsuariosRepository;
let examRepository: FakeExamesRepository;
let cryptographyService: FakeCryptographyService;
let maskingService: FakeMaskingService;
let usecase: CreateExamUseCase;

describe('CreateExamUseCase', () => {
  beforeEach(() => {
    userRepository = new FakeUsuariosRepository();
    examRepository = new FakeExamesRepository();
    cryptographyService = new FakeCryptographyService();
    maskingService = new FakeMaskingService();
    usecase = new CreateExamUseCase(
      userRepository,
      examRepository,
      cryptographyService,
      maskingService,
    );

    vi.clearAllMocks();
  });

  it('should create an exam encrypting sensitive data and masking the cpf', async () => {
    const usuario = UsuarioBuilder.anUser().getData();
    const exame = ExameBuilder.anExame().withIdUsuario(usuario.id).getData();
    const comorbidades = faker.lorem.words(3);
    const descricao = faker.lorem.sentence();

    userRepository.findBy.mockResolvedValue(usuario);
    examRepository.create.mockImplementation(async (input) => input);

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
    expect(maskingService.maskCpf).toHaveBeenCalledWith(exame.cpf);
    expect(maskingService.maskName).toHaveBeenCalledWith(exame.nomeCompleto);
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({ text: exame.dtNascimento });
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({ text: comorbidades });
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({ text: descricao });

    expect(examRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        idUsuario: usuario.id,
        nomeCompleto: `masked-name(${exame.nomeCompleto})`,
        cpf: `masked(${exame.cpf})`,
        sexo: exame.sexo,
        dtNascimento: `enc(${exame.dtNascimento})`,
        dtHora: exame.dtHora,
        status: ExameStatus.CRIADO,
        comorbidades: `enc(${comorbidades})`,
        descricao: `enc(${descricao})`,
      }),
    );
    expect(result.cpf).toBe(`masked(${exame.cpf})`);
  });

  it('should not encrypt optional fields when not provided', async () => {
    const usuario = UsuarioBuilder.anUser().getData();
    const exame = ExameBuilder.anExame().withIdUsuario(usuario.id).getData();

    userRepository.findBy.mockResolvedValue(usuario);
    examRepository.create.mockImplementation(async (input) => input);

    await usecase.execute({
      idUsuario: usuario.id,
      nomeCompleto: exame.nomeCompleto,
      cpf: exame.cpf,
      sexo: exame.sexo,
      dtNascimento: exame.dtNascimento,
      dtHora: exame.dtHora,
    });

    expect(cryptographyService.encrypt).not.toHaveBeenCalledWith({ text: undefined });
    expect(examRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        comorbidades: undefined,
        descricao: undefined,
        status: ExameStatus.CRIADO,
      }),
    );
  });

  it('should generate a new id for the exam', async () => {
    const usuario = UsuarioBuilder.anUser().getData();
    const exame = ExameBuilder.anExame().withIdUsuario(usuario.id).getData();

    userRepository.findBy.mockResolvedValue(usuario);
    examRepository.create.mockImplementation(async (input) => input);

    await usecase.execute({
      idUsuario: usuario.id,
      nomeCompleto: exame.nomeCompleto,
      cpf: exame.cpf,
      sexo: exame.sexo,
      dtNascimento: exame.dtNascimento,
      dtHora: exame.dtHora,
    });

    const [arg] = examRepository.create.mock.calls[0];
    expect(arg.id).toEqual(expect.any(String));
    expect(arg.id).toHaveLength(36);
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
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(examRepository.create).not.toHaveBeenCalled();
    expect(cryptographyService.encrypt).not.toHaveBeenCalled();
    expect(maskingService.maskCpf).not.toHaveBeenCalled();
    expect(maskingService.maskName).not.toHaveBeenCalled();
  });
});
