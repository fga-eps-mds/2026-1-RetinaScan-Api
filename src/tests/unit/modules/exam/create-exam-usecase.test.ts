import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import type { UsuariosRepository } from '@/modules/users/repositories/users-repository';
import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import { ExameStatus, type Sexo } from '@/modules/exam/exam';
import { CreateExamUseCase } from '@/modules/exam/use-cases/create-exam-usecase';
import { NotFoundError } from '@/shared/errors';
import type { CryptographyService, MessageBroker, StorageService } from '@/shared/services';
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

class FakeImagemRepository implements ImagemRepository {
  findMany = vi.fn();
  createMany = vi.fn();
}

class FakeStorageService implements StorageService {
  upload = vi.fn();
  uploadPrivate = vi.fn();
  deleteByUrl = vi.fn();
  deleteByKey = vi.fn();
  getPresignedUrl = vi.fn();
  objectExists = vi.fn();
  copy = vi.fn();
}

class FakeMessageBroker implements MessageBroker {
  publish = vi.fn();
}

class FakeCryptographyService implements CryptographyService {
  encrypt = vi.fn(({ text }: { text: string }) => ({
    encryptedText: `enc(${text})`,
  }));
  decrypt = vi.fn();
}

let userRepo: FakeUsuariosRepository;
let examRepo: FakeExamesRepository;
let imagemRepo: FakeImagemRepository;
let storage: FakeStorageService;
let messageBroker: FakeMessageBroker;
let cryptographyService: FakeCryptographyService;
let usecase: CreateExamUseCase;
let baseInput: {
  idUsuario: string;
  nomeCompleto: string;
  cpf: string;
  sexo: Sexo;
  dtNascimento: string;
  dtHora: Date;
  comorbidades: {
    diabetes: boolean;
    diabetesUsoInsulina: boolean;
    diabetesControlado: boolean;
    hipertensao: boolean;
    hipertensaoControlada: boolean;
    altaMiopia: boolean;
    glaucoma: boolean;
    usoHidroxicloroquina: boolean;
    uveite: boolean;
    catarata: boolean;
    outrasComorbidades: boolean;
    qualidadeTecnicaDificuldade: boolean;
  };
};

describe('CreateExamUseCase', () => {
  beforeEach(() => {
    userRepo = new FakeUsuariosRepository();
    examRepo = new FakeExamesRepository();
    imagemRepo = new FakeImagemRepository();
    storage = new FakeStorageService();
    messageBroker = new FakeMessageBroker();
    cryptographyService = new FakeCryptographyService();
    usecase = new CreateExamUseCase(
      userRepo,
      examRepo,
      cryptographyService,
      imagemRepo,
      storage,
      messageBroker,
    );

    vi.clearAllMocks();

    storage.copy.mockResolvedValue(undefined);
    storage.deleteByKey.mockResolvedValue(undefined);

    const exame = ExameBuilder.anExame().getData();
    baseInput = {
      idUsuario: 'u1',
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
    };
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

    userRepo.findBy.mockResolvedValue(usuario);
    storage.objectExists.mockResolvedValue(true);
    examRepo.createWithComorbidity.mockImplementation(async ({ exam }) => exam);
    imagemRepo.createMany.mockImplementation(async (imgs) => imgs);

    const result = await usecase.execute({
      idUsuario: usuario.id,
      nomeCompleto: exame.nomeCompleto,
      cpf: exame.cpf,
      sexo: exame.sexo,
      dtNascimento: exame.dtNascimento,
      dtHora: exame.dtHora,
      comorbidades,
      descricao,
      imagens: [{ uploadId: 'up-1', lateralidade: 'OD' }],
    });

    expect(userRepo.findBy).toHaveBeenCalledWith({ id: usuario.id });
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({
      text: exame.dtNascimento,
    });
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({
      text: descricao,
    });
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({
      text: outrasComorbidadesDescricao,
    });

    expect(examRepo.createWithComorbidity).toHaveBeenCalledWith(
      expect.objectContaining({
        exam: expect.objectContaining({
          idUsuario: usuario.id,
          nomeCompleto: exame.nomeCompleto,
          cpf: exame.cpf,
          sexo: exame.sexo,
          dtNascimento: `enc(${exame.dtNascimento})`,
          dtHora: exame.dtHora,
          status: ExameStatus.EM_PROCESSAMENTO,
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

    userRepo.findBy.mockResolvedValue(usuario);
    storage.objectExists.mockResolvedValue(true);
    examRepo.createWithComorbidity.mockImplementation(async ({ exam }) => exam);
    imagemRepo.createMany.mockImplementation(async (imgs) => imgs);

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
      imagens: [{ uploadId: 'up-1', lateralidade: 'OD' }],
    });

    expect(cryptographyService.encrypt).toHaveBeenCalledTimes(1);
    expect(cryptographyService.encrypt).toHaveBeenCalledWith({
      text: exame.dtNascimento,
    });

    expect(examRepo.createWithComorbidity).toHaveBeenCalledWith(
      expect.objectContaining({
        exam: expect.objectContaining({
          descricao: undefined,
          status: ExameStatus.EM_PROCESSAMENTO,
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

    userRepo.findBy.mockResolvedValue(usuario);
    storage.objectExists.mockResolvedValue(true);
    examRepo.createWithComorbidity.mockImplementation(async ({ exam }) => exam);
    imagemRepo.createMany.mockImplementation(async (imgs) => imgs);

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
      imagens: [{ uploadId: 'up-1', lateralidade: 'OD' }],
    });

    const [arg] = examRepo.createWithComorbidity.mock.calls[0];

    expect(arg.exam.id).toEqual(expect.any(String));
    expect(arg.exam.id).toHaveLength(36);
    expect(arg.comorbidades.idExame).toBe(arg.exam.id);
  });

  it('should throw NotFoundError when user does not exist', async () => {
    const exame = ExameBuilder.anExame().getData();

    userRepo.findBy.mockResolvedValue(null);

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
        imagens: [{ uploadId: 'up-1', lateralidade: 'OD' }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(examRepo.createWithComorbidity).not.toHaveBeenCalled();
    expect(cryptographyService.encrypt).not.toHaveBeenCalled();
  });

  it('adota imagens: valida posse, copia pending->exams, cria Imagem e dispara IA', async () => {
    userRepo.findBy.mockResolvedValue({ id: 'u1' });
    storage.objectExists.mockResolvedValue(true);
    examRepo.createWithComorbidity.mockImplementation(async ({ exam }) => exam);
    imagemRepo.createMany.mockImplementation(async (imgs) => imgs);

    const out = await usecase.execute({
      ...baseInput,
      idUsuario: 'u1',
      imagens: [{ uploadId: 'up-1', lateralidade: 'OD' }],
    });

    expect(storage.objectExists).toHaveBeenCalledWith('pending/u1/up-1.jpg', 'exam-images');
    expect(storage.copy).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceKey: 'pending/u1/up-1.jpg',
        destinationKey: expect.stringMatching(new RegExp(`^exams/${out.id}/OD-.+\\.jpg$`)),
      }),
      'exam-images',
    );
    expect(imagemRepo.createMany).toHaveBeenCalledTimes(1);
    expect(messageBroker.publish).toHaveBeenCalledWith(
      expect.objectContaining({ queueName: 'process-images' }),
    );
    expect(out.status).toBe('EM_PROCESSAMENTO');
    expect(out.olho).toBe('OD');
  });

  it('resolve olho AO com duas imagens', async () => {
    userRepo.findBy.mockResolvedValue({ id: 'u1' });
    storage.objectExists.mockResolvedValue(true);
    examRepo.createWithComorbidity.mockImplementation(async ({ exam }) => exam);
    imagemRepo.createMany.mockImplementation(async (imgs) => imgs);

    const out = await usecase.execute({
      ...baseInput,
      idUsuario: 'u1',
      imagens: [
        { uploadId: 'up-1', lateralidade: 'OD' },
        { uploadId: 'up-2', lateralidade: 'OE' },
      ],
    });
    expect(out.olho).toBe('AO');
  });

  it('NotFound quando o upload não existe (posse pela chave)', async () => {
    userRepo.findBy.mockResolvedValue({ id: 'u1' });
    storage.objectExists.mockResolvedValue(false);
    await expect(
      usecase.execute({
        ...baseInput,
        idUsuario: 'u1',
        imagens: [{ uploadId: 'x', lateralidade: 'OD' }],
      }),
    ).rejects.toMatchObject({ name: 'NotFoundError' });
    expect(examRepo.createWithComorbidity).not.toHaveBeenCalled();
  });

  it('rollback: se createWithComorbidity falha, apaga as imagens já copiadas em exams/', async () => {
    userRepo.findBy.mockResolvedValue({ id: 'u1' });
    storage.objectExists.mockResolvedValue(true);
    examRepo.createWithComorbidity.mockRejectedValue(new Error('db down'));
    await expect(
      usecase.execute({
        ...baseInput,
        idUsuario: 'u1',
        imagens: [{ uploadId: 'up-1', lateralidade: 'OD' }],
      }),
    ).rejects.toThrow('db down');
    expect(storage.deleteByKey).toHaveBeenCalledWith(
      expect.stringMatching(/^exams\/.+\/OD-.+\.jpg$/),
      'exam-images',
    );
  });
});
