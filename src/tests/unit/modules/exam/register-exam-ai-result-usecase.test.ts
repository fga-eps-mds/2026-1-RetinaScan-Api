import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';

import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import type { ResultadoIaRepository } from '@/modules/exam/resultado-ia-repository';
import { ExameStatus } from '@/modules/exam/exam';
import { LateralidadeOlho, type Imagem } from '@/modules/exam/imagem';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import { ImagemBuilder } from '@/tests/helpers/builders/imagem-builder';
import {
  RegisterExamAiResultUseCase,
  type RegisterExamAiResultItem,
} from '@/modules/exam/use-cases/register-exam-ai-result-usecase';

class FakeExamesRepository implements ExamesRepository {
  create = vi.fn();
  findOne = vi.fn();
  findMany = vi.fn();
  update = vi.fn();
}

class FakeImagemRepository implements ImagemRepository {
  findMany = vi.fn();
  createMany = vi.fn();
}

class FakeResultadoIaRepository implements ResultadoIaRepository {
  createMany = vi.fn();
  existsByExamId = vi.fn();
  findByExamId = vi.fn();
}

let examRepository: FakeExamesRepository;
let imagemRepository: FakeImagemRepository;
let resultadoIaRepository: FakeResultadoIaRepository;
let usecase: RegisterExamAiResultUseCase;

const buildResult = (
  filename: string,
  overrides: Partial<RegisterExamAiResultItem> = {},
): RegisterExamAiResultItem => ({
  filename,
  contentType: 'image/png',
  predictedClass: 0,
  predictedLabel: 'no_dr',
  confidence: 0.95,
  probabilities: { no_dr: 0.95, mild: 0.05 },
  ...overrides,
});

const buildImagem = (overrides: Partial<Imagem> & { examId?: string } = {}): Imagem => {
  const { examId, ...rest } = overrides;
  const data = ImagemBuilder.anImagem().getData();
  if (examId) data.idExame = examId;
  return { ...data, ...rest };
};

describe('RegisterExamAiResultUseCase', () => {
  beforeEach(() => {
    examRepository = new FakeExamesRepository();
    imagemRepository = new FakeImagemRepository();
    resultadoIaRepository = new FakeResultadoIaRepository();
    usecase = new RegisterExamAiResultUseCase(
      examRepository,
      imagemRepository,
      resultadoIaRepository,
    );

    vi.clearAllMocks();
  });

  it('should persist all resultados and mark exam as CONCLUIDO on happy path', async () => {
    const exame = ExameBuilder.anExame().getData();
    const imagemOd = buildImagem({
      examId: exame.id,
      lateralidadeOlho: LateralidadeOlho.OD,
      caminhoImg: `exams/${exame.id}/od.png`,
    });
    const imagemOe = buildImagem({
      examId: exame.id,
      lateralidadeOlho: LateralidadeOlho.OE,
      caminhoImg: `exams/${exame.id}/oe.png`,
    });

    examRepository.findOne.mockResolvedValue(exame);
    resultadoIaRepository.existsByExamId.mockResolvedValue(false);
    imagemRepository.findMany.mockResolvedValue([imagemOd, imagemOe]);
    resultadoIaRepository.createMany.mockResolvedValue(undefined);
    examRepository.update.mockResolvedValue(undefined);

    const results = [
      buildResult(imagemOd.caminhoImg, { predictedClass: 1, predictedLabel: 'mild' }),
      buildResult(imagemOe.caminhoImg, { predictedClass: 0, predictedLabel: 'no_dr' }),
    ];

    await usecase.execute({
      examId: exame.id,
      payloadExamId: exame.id,
      totalImages: 2,
      results,
    });

    expect(resultadoIaRepository.createMany).toHaveBeenCalledTimes(1);
    const [createArg] = resultadoIaRepository.createMany.mock.calls[0];
    expect(createArg.resultados).toHaveLength(2);
    expect(createArg.resultados[0]).toEqual(
      expect.objectContaining({
        idImagem: imagemOd.id,
        predictedClass: 1,
        predictedLabel: 'mild',
        confidence: 0.95,
        probabilities: { no_dr: 0.95, mild: 0.05 },
      }),
    );
    expect(createArg.resultados[0].id).toEqual(expect.any(String));
    expect(createArg.resultados[1]).toEqual(
      expect.objectContaining({
        idImagem: imagemOe.id,
        predictedClass: 0,
        predictedLabel: 'no_dr',
      }),
    );

    expect(examRepository.update).toHaveBeenCalledWith({
      examId: exame.id,
      data: { status: ExameStatus.CONCLUIDO },
    });
  });

  it('should throw ValidationError when payloadExamId differs from examId', async () => {
    await expect(
      usecase.execute({
        examId: faker.string.uuid(),
        payloadExamId: faker.string.uuid(),
        totalImages: 1,
        results: [buildResult('any-key.png')],
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(examRepository.findOne).not.toHaveBeenCalled();
    expect(resultadoIaRepository.createMany).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when totalImages does not match results.length', async () => {
    const examId = faker.string.uuid();

    await expect(
      usecase.execute({
        examId,
        payloadExamId: examId,
        totalImages: 2,
        results: [buildResult('any-key.png')],
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(examRepository.findOne).not.toHaveBeenCalled();
    expect(resultadoIaRepository.createMany).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when exam does not exist', async () => {
    const examId = faker.string.uuid();
    examRepository.findOne.mockResolvedValue(null);

    await expect(
      usecase.execute({
        examId,
        payloadExamId: examId,
        totalImages: 1,
        results: [buildResult('any-key.png')],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(resultadoIaRepository.createMany).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ConflictError when exam already has resultados', async () => {
    const exame = ExameBuilder.anExame().getData();
    examRepository.findOne.mockResolvedValue(exame);
    resultadoIaRepository.existsByExamId.mockResolvedValue(true);

    await expect(
      usecase.execute({
        examId: exame.id,
        payloadExamId: exame.id,
        totalImages: 1,
        results: [buildResult('any-key.png')],
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(imagemRepository.findMany).not.toHaveBeenCalled();
    expect(resultadoIaRepository.createMany).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when filename does not match any exam image caminhoImg', async () => {
    const exame = ExameBuilder.anExame().getData();
    const imagem = buildImagem({
      examId: exame.id,
      lateralidadeOlho: LateralidadeOlho.OD,
      caminhoImg: `exams/${exame.id}/od.png`,
    });

    examRepository.findOne.mockResolvedValue(exame);
    resultadoIaRepository.existsByExamId.mockResolvedValue(false);
    imagemRepository.findMany.mockResolvedValue([imagem]);

    await expect(
      usecase.execute({
        examId: exame.id,
        payloadExamId: exame.id,
        totalImages: 1,
        results: [buildResult('outro/caminho.png')],
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(resultadoIaRepository.createMany).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when imagens count diverges from results count', async () => {
    const exame = ExameBuilder.anExame().getData();
    const imagemOd = buildImagem({
      examId: exame.id,
      lateralidadeOlho: LateralidadeOlho.OD,
      caminhoImg: `exams/${exame.id}/od.png`,
    });
    const imagemOe = buildImagem({
      examId: exame.id,
      lateralidadeOlho: LateralidadeOlho.OE,
      caminhoImg: `exams/${exame.id}/oe.png`,
    });

    examRepository.findOne.mockResolvedValue(exame);
    resultadoIaRepository.existsByExamId.mockResolvedValue(false);
    imagemRepository.findMany.mockResolvedValue([imagemOd, imagemOe]);

    await expect(
      usecase.execute({
        examId: exame.id,
        payloadExamId: exame.id,
        totalImages: 1,
        results: [buildResult(imagemOd.caminhoImg)],
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(resultadoIaRepository.createMany).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when two results reference the same image filename', async () => {
    const exame = ExameBuilder.anExame().getData();
    const imagemOd = buildImagem({
      examId: exame.id,
      lateralidadeOlho: LateralidadeOlho.OD,
      caminhoImg: `exams/${exame.id}/od.png`,
    });
    const imagemOe = buildImagem({
      examId: exame.id,
      lateralidadeOlho: LateralidadeOlho.OE,
      caminhoImg: `exams/${exame.id}/oe.png`,
    });

    examRepository.findOne.mockResolvedValue(exame);
    resultadoIaRepository.existsByExamId.mockResolvedValue(false);
    imagemRepository.findMany.mockResolvedValue([imagemOd, imagemOe]);

    await expect(
      usecase.execute({
        examId: exame.id,
        payloadExamId: exame.id,
        totalImages: 2,
        results: [buildResult(imagemOd.caminhoImg), buildResult(imagemOd.caminhoImg)],
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(resultadoIaRepository.createMany).not.toHaveBeenCalled();
    expect(examRepository.update).not.toHaveBeenCalled();
  });

  it('should propagate createMany failure and not call exam update', async () => {
    const exame = ExameBuilder.anExame().getData();
    const imagem = buildImagem({
      examId: exame.id,
      lateralidadeOlho: LateralidadeOlho.OD,
      caminhoImg: `exams/${exame.id}/od.png`,
    });

    examRepository.findOne.mockResolvedValue(exame);
    resultadoIaRepository.existsByExamId.mockResolvedValue(false);
    imagemRepository.findMany.mockResolvedValue([imagem]);
    const dbError = new Error('db down');
    resultadoIaRepository.createMany.mockRejectedValue(dbError);

    await expect(
      usecase.execute({
        examId: exame.id,
        payloadExamId: exame.id,
        totalImages: 1,
        results: [buildResult(imagem.caminhoImg)],
      }),
    ).rejects.toBe(dbError);

    expect(examRepository.update).not.toHaveBeenCalled();
  });
});
