import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetExamDetailsUseCase } from '@/modules/exam/use-cases/get-exam-details-usecase';
import { ExameStatus, Sexo, type Comorbidade, type Exame } from '@/modules/exam/exam';
import { LateralidadeOlho, QualidadeImagem, type Imagem } from '@/modules/exam/imagem';
import type { ResultadoIa } from '@/modules/exam/resultado-ia';
import { tiposPerfil, type Usuario } from '@/modules/users/domain';
import { NotFoundError, UnauthorizedError } from '@/shared/errors';
import { Buckets } from '@/shared/services/storage-service';
import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import type { ResultadoIaRepository } from '@/modules/exam/resultado-ia-repository';
import type { ComorbidadeRepository } from '@/modules/exam/comorbidade-repository';
import type { UsuariosRepository } from '@/modules/users/repositories';
import type { StorageService } from '@/shared/services/storage-service';
import type { CryptographyService } from '@/shared/services/cryptography-service';

const EXAM_ID = 'exam-1';
const MEDICO_ID = 'medico-1';
const OUTRO_MEDICO_ID = 'medico-2';
const IMG_OD_ID = 'img-od';
const IMG_OE_ID = 'img-oe';

function buildExam(overrides: Partial<Exame> = {}): Exame {
  return {
    id: EXAM_ID,
    idUsuario: MEDICO_ID,
    nomeCompleto: 'João Carlos',
    cpf: '12345678901',
    sexo: Sexo.MASCULINO,
    dtNascimento: '1980-04-12',
    dtHora: new Date('2026-03-24T10:30:00.000Z'),
    status: ExameStatus.CONCLUIDO,
    olho: 'AO',
    descricao: null,
    ...overrides,
  };
}

function buildMedico(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: MEDICO_ID,
    nomeCompleto: 'Dr. Silva',
    email: 'silva@example.com',
    cpf: '00000000000',
    crm: 'CRM/SP 12345',
    dtNascimento: '1970-01-01',
    tipoPerfil: tiposPerfil.MEDICO,
    image: null,
    ...overrides,
  } as Usuario & typeof overrides;
}

function buildImagem(overrides: Partial<Imagem> = {}): Imagem {
  return {
    id: IMG_OD_ID,
    idExame: EXAM_ID,
    lateralidadeOlho: LateralidadeOlho.OD,
    caminhoImg: `exams/${EXAM_ID}/OD.jpg`,
    qualidadeImg: QualidadeImagem.Pendente,
    ...overrides,
  };
}

function buildResultado(overrides: Partial<ResultadoIa> = {}): ResultadoIa {
  return {
    id: 'res-1',
    idImagem: IMG_OD_ID,
    predictedClass: 0,
    predictedLabel: 'Normal',
    confidence: 0.97,
    probabilities: { Normal: 0.97, Alterado: 0.03 },
    ...overrides,
  };
}

function buildComorbidade(overrides: Partial<Comorbidade> = {}): Comorbidade {
  return {
    idExame: EXAM_ID,
    diabetes: false,
    diabetesAnos: null,
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
    outrasComorbidadesDescricao: null,
    qualidadeTecnicaDificuldade: false,
    ...overrides,
  };
}

describe('GetExamDetailsUseCase', () => {
  let examesRepository: { findOne: ReturnType<typeof vi.fn> };
  let usuariosRepository: { findBy: ReturnType<typeof vi.fn> };
  let imagemRepository: { findMany: ReturnType<typeof vi.fn> };
  let resultadoIaRepository: { findByExamId: ReturnType<typeof vi.fn> };
  let comorbidadeRepository: { findByExamId: ReturnType<typeof vi.fn> };
  let storageService: { getPresignedUrl: ReturnType<typeof vi.fn> };
  let cryptographyService: { encrypt: ReturnType<typeof vi.fn>; decrypt: ReturnType<typeof vi.fn> };
  let useCase: GetExamDetailsUseCase;

  beforeEach(() => {
    examesRepository = { findOne: vi.fn() };
    usuariosRepository = { findBy: vi.fn() };
    imagemRepository = { findMany: vi.fn() };
    resultadoIaRepository = { findByExamId: vi.fn() };
    comorbidadeRepository = { findByExamId: vi.fn().mockResolvedValue(null) };
    storageService = {
      getPresignedUrl: vi.fn(async (input: { key: string }) => `https://signed/${input.key}`),
    };
    cryptographyService = {
      encrypt: vi.fn(),
      decrypt: vi.fn((input: { encryptedText: string }) => ({
        text: input.encryptedText.replace(/^enc:/, ''),
      })),
    };

    useCase = new GetExamDetailsUseCase(
      examesRepository as unknown as ExamesRepository,
      usuariosRepository as unknown as UsuariosRepository,
      imagemRepository as unknown as ImagemRepository,
      resultadoIaRepository as unknown as ResultadoIaRepository,
      comorbidadeRepository as unknown as ComorbidadeRepository,
      storageService as unknown as StorageService,
      cryptographyService as unknown as CryptographyService,
    );
  });

  it('retorna exame CONCLUIDO com imagens (presigned) e resultadoIa por imagem', async () => {
    const exame = buildExam();
    const medico = buildMedico();
    const imgOd = buildImagem({ id: IMG_OD_ID, lateralidadeOlho: LateralidadeOlho.OD });
    const imgOe = buildImagem({
      id: IMG_OE_ID,
      lateralidadeOlho: LateralidadeOlho.OE,
      caminhoImg: `exams/${EXAM_ID}/OE.jpg`,
    });
    const resOd = buildResultado({ id: 'res-od', idImagem: IMG_OD_ID });
    const resOe = buildResultado({
      id: 'res-oe',
      idImagem: IMG_OE_ID,
      predictedLabel: 'Alterado',
      predictedClass: 1,
      probabilities: { Normal: 0.1, Alterado: 0.9 },
    });

    examesRepository.findOne.mockResolvedValue(exame);
    usuariosRepository.findBy.mockResolvedValue(medico);
    imagemRepository.findMany.mockResolvedValue([imgOd, imgOe]);
    resultadoIaRepository.findByExamId.mockResolvedValue([resOd, resOe]);

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
    });

    expect(resultadoIaRepository.findByExamId).toHaveBeenCalledTimes(1);
    expect(storageService.getPresignedUrl).toHaveBeenCalledWith({
      key: imgOd.caminhoImg,
      bucket: Buckets.examImages,
      expiresInSeconds: 900,
    });
    expect(output.medico).toEqual({ id: medico.id, nomeCompleto: medico.nomeCompleto });
    expect(output.imagens).toHaveLength(2);
    expect(output.imagens[0]).toMatchObject({
      id: IMG_OD_ID,
      url: `https://signed/${imgOd.caminhoImg}`,
      resultadoIa: { id: 'res-od', predictedLabel: 'Normal' },
    });
    expect(output.imagens[1].resultadoIa).toMatchObject({ predictedLabel: 'Alterado' });
  });

  it('não consulta ResultadoIa quando status é EM_PROCESSAMENTO', async () => {
    examesRepository.findOne.mockResolvedValue(
      buildExam({ status: ExameStatus.EM_PROCESSAMENTO }),
    );
    usuariosRepository.findBy.mockResolvedValue(buildMedico());
    imagemRepository.findMany.mockResolvedValue([buildImagem()]);

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
    });

    expect(resultadoIaRepository.findByExamId).not.toHaveBeenCalled();
    expect(output.imagens[0].resultadoIa).toBeNull();
  });

  it('não consulta ResultadoIa quando status é ERRO_PROCESSAMENTO', async () => {
    examesRepository.findOne.mockResolvedValue(
      buildExam({ status: ExameStatus.ERRO_PROCESSAMENTO }),
    );
    usuariosRepository.findBy.mockResolvedValue(buildMedico());
    imagemRepository.findMany.mockResolvedValue([buildImagem()]);

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
    });

    expect(resultadoIaRepository.findByExamId).not.toHaveBeenCalled();
    expect(output.status).toBe(ExameStatus.ERRO_PROCESSAMENTO);
    expect(output.imagens[0].resultadoIa).toBeNull();
  });

  it('retorna imagens vazias e resultadoIa não chamado quando status é CRIADO sem imagens', async () => {
    examesRepository.findOne.mockResolvedValue(buildExam({ status: ExameStatus.CRIADO }));
    usuariosRepository.findBy.mockResolvedValue(buildMedico());
    imagemRepository.findMany.mockResolvedValue([]);

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
    });

    expect(resultadoIaRepository.findByExamId).not.toHaveBeenCalled();
    expect(output.imagens).toEqual([]);
  });

  it('lança NotFoundError quando exame não existe', async () => {
    examesRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute({
        examId: EXAM_ID,
        requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança UnauthorizedError quando MEDICO tenta ver exame de outro médico', async () => {
    examesRepository.findOne.mockResolvedValue(buildExam({ idUsuario: OUTRO_MEDICO_ID }));

    await expect(
      useCase.execute({
        examId: EXAM_ID,
        requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('permite ADMIN ver exame de qualquer médico', async () => {
    examesRepository.findOne.mockResolvedValue(buildExam({ idUsuario: OUTRO_MEDICO_ID }));
    usuariosRepository.findBy.mockResolvedValue(
      buildMedico({ id: OUTRO_MEDICO_ID, nomeCompleto: 'Dr. Outro' }),
    );
    imagemRepository.findMany.mockResolvedValue([]);
    resultadoIaRepository.findByExamId.mockResolvedValue([]);

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: 'admin-1', tipoPerfil: tiposPerfil.ADMIN },
    });

    expect(output.medico.nomeCompleto).toBe('Dr. Outro');
  });

  it('decripta dtNascimento e descricao no output', async () => {
    examesRepository.findOne.mockResolvedValue(
      buildExam({
        dtNascimento: 'enc:1980-04-12',
        descricao: 'enc:exame de rotina',
      }),
    );
    usuariosRepository.findBy.mockResolvedValue(buildMedico());
    imagemRepository.findMany.mockResolvedValue([]);
    resultadoIaRepository.findByExamId.mockResolvedValue([]);

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
    });

    expect(output.dtNascimento).toBe('1980-04-12');
    expect(output.descricao).toBe('exame de rotina');
    expect(cryptographyService.decrypt).toHaveBeenCalledTimes(2);
  });

  it('retorna comorbidades estruturadas quando registro existe', async () => {
    examesRepository.findOne.mockResolvedValue(buildExam({ dtNascimento: 'enc:1980-04-12' }));
    usuariosRepository.findBy.mockResolvedValue(buildMedico());
    imagemRepository.findMany.mockResolvedValue([]);
    resultadoIaRepository.findByExamId.mockResolvedValue([]);
    comorbidadeRepository.findByExamId.mockResolvedValue(
      buildComorbidade({
        diabetes: true,
        diabetesAnos: 10,
        diabetesUsoInsulina: true,
        diabetesControlado: true,
        hipertensao: true,
        outrasComorbidades: true,
        outrasComorbidadesDescricao: 'Asma',
      }),
    );

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
    });

    expect(comorbidadeRepository.findByExamId).toHaveBeenCalledWith({ examId: EXAM_ID });
    expect(output.comorbidades).toEqual({
      diabetes: true,
      diabetesAnos: 10,
      diabetesUsoInsulina: true,
      diabetesControlado: true,
      hipertensao: true,
      hipertensaoControlada: false,
      altaMiopia: false,
      glaucoma: false,
      usoHidroxicloroquina: false,
      uveite: false,
      catarata: false,
      outrasComorbidades: true,
      outrasComorbidadesDescricao: 'Asma',
      qualidadeTecnicaDificuldade: false,
    });
  });

  it('retorna comorbidades null quando exame não possui registro', async () => {
    examesRepository.findOne.mockResolvedValue(buildExam({ dtNascimento: 'enc:1990-01-01' }));
    usuariosRepository.findBy.mockResolvedValue(buildMedico());
    imagemRepository.findMany.mockResolvedValue([]);
    resultadoIaRepository.findByExamId.mockResolvedValue([]);
    comorbidadeRepository.findByExamId.mockResolvedValue(null);

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
    });

    expect(output.comorbidades).toBeNull();
    expect(output.descricao).toBeNull();
  });

  it('lança NotFoundError quando médico dono do exame não existe (exame órfão)', async () => {
    examesRepository.findOne.mockResolvedValue(buildExam());
    usuariosRepository.findBy.mockResolvedValue(null);

    await expect(
      useCase.execute({
        examId: EXAM_ID,
        requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('retorna resultadoIa null para imagem sem resultado correspondente em status CONCLUIDO', async () => {
    examesRepository.findOne.mockResolvedValue(buildExam());
    usuariosRepository.findBy.mockResolvedValue(buildMedico());
    imagemRepository.findMany.mockResolvedValue([
      buildImagem({ id: IMG_OD_ID }),
      buildImagem({ id: IMG_OE_ID, lateralidadeOlho: LateralidadeOlho.OE }),
    ]);
    resultadoIaRepository.findByExamId.mockResolvedValue([
      buildResultado({ idImagem: IMG_OD_ID }),
    ]);

    const output = await useCase.execute({
      examId: EXAM_ID,
      requester: { id: MEDICO_ID, tipoPerfil: tiposPerfil.MEDICO },
    });

    expect(output.imagens[0].resultadoIa).not.toBeNull();
    expect(output.imagens[1].resultadoIa).toBeNull();
  });
});
