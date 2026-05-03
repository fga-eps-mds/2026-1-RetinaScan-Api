import { describe, it, expect, beforeEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';

import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import { LateralidadeOlho, type Imagem } from '@/modules/exam/imagem';
import { Buckets, type StorageService } from '@/shared/services';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { ExameBuilder } from '@/tests/helpers/builders/exame-builder';
import {
  UploadExamImagesUseCase,
  type UploadExamImageInput,
} from '@/modules/exam/use-cases/upload-exam-images-usecase';

class FakeExamesRepository implements ExamesRepository {
  create = vi.fn();
  findOne = vi.fn();
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
}

let examRepository: FakeExamesRepository;
let imagemRepository: FakeImagemRepository;
let storageService: FakeStorageService;
let usecase: UploadExamImagesUseCase;

const buildImageInput = (
  lateralidade: LateralidadeOlho,
  overrides: Partial<UploadExamImageInput> = {},
): UploadExamImageInput => ({
  lateralidade,
  buffer: Buffer.from('fake-bytes'),
  contentType: 'image/jpeg',
  extension: 'jpg',
  ...overrides,
});

describe('UploadExamImagesUseCase', () => {
  beforeEach(() => {
    examRepository = new FakeExamesRepository();
    imagemRepository = new FakeImagemRepository();
    storageService = new FakeStorageService();
    usecase = new UploadExamImagesUseCase(examRepository, imagemRepository, storageService);

    vi.clearAllMocks();
  });

  it('should upload a single OD image and persist with qualidadeImg Pendente', async () => {
    const userId = faker.string.uuid();
    const exame = ExameBuilder.anExame().withIdUsuario(userId).getData();

    examRepository.findOne.mockResolvedValue(exame);
    imagemRepository.findMany.mockResolvedValue([]);
    storageService.uploadPrivate.mockResolvedValue(undefined);
    imagemRepository.createMany.mockImplementation(async (input: Imagem[]) => input);

    const input = buildImageInput(LateralidadeOlho.OD);

    const result = await usecase.execute({
      examId: exame.id,
      userId,
      imagens: [input],
    });

    expect(storageService.uploadPrivate).toHaveBeenCalledTimes(1);
    const [uploadArgs, bucketArg] = storageService.uploadPrivate.mock.calls[0];
    expect(bucketArg).toBe(Buckets.examImages);
    expect(uploadArgs.key).toMatch(new RegExp(`^exams/${exame.id}/OD-.+\\.jpg$`));
    expect(uploadArgs.buffer).toBe(input.buffer);
    expect(uploadArgs.contentType).toBe('image/jpeg');

    expect(imagemRepository.createMany).toHaveBeenCalledTimes(1);
    const [persisted] = imagemRepository.createMany.mock.calls[0];
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toEqual(
      expect.objectContaining({
        idExame: exame.id,
        lateralidadeOlho: LateralidadeOlho.OD,
        caminhoImg: uploadArgs.key,
        qualidadeImg: 'Pendente',
      }),
    );
    expect(persisted[0].id).toEqual(expect.any(String));

    expect(result.imagens).toEqual([
      {
        id: persisted[0].id,
        idExame: persisted[0].idExame,
        lateralidadeOlho: persisted[0].lateralidadeOlho,
        qualidadeImg: persisted[0].qualidadeImg,
      },
    ]);
    expect(result.imagens[0]).not.toHaveProperty('caminhoImg');
    expect(storageService.deleteByKey).not.toHaveBeenCalled();
  });

  it('should upload OD and OE images and persist both', async () => {
    const userId = faker.string.uuid();
    const exame = ExameBuilder.anExame().withIdUsuario(userId).getData();

    examRepository.findOne.mockResolvedValue(exame);
    imagemRepository.findMany.mockResolvedValue([]);
    storageService.uploadPrivate.mockResolvedValue(undefined);
    imagemRepository.createMany.mockImplementation(async (input: Imagem[]) => input);

    const od = buildImageInput(LateralidadeOlho.OD, {
      extension: 'png',
      contentType: 'image/png',
    });
    const oe = buildImageInput(LateralidadeOlho.OE);

    const result = await usecase.execute({
      examId: exame.id,
      userId,
      imagens: [od, oe],
    });

    expect(storageService.uploadPrivate).toHaveBeenCalledTimes(2);
    const firstKey = storageService.uploadPrivate.mock.calls[0][0].key;
    const secondKey = storageService.uploadPrivate.mock.calls[1][0].key;
    expect(firstKey).toMatch(new RegExp(`^exams/${exame.id}/OD-.+\\.png$`));
    expect(secondKey).toMatch(new RegExp(`^exams/${exame.id}/OE-.+\\.jpg$`));

    expect(imagemRepository.createMany).toHaveBeenCalledTimes(1);
    const [persisted] = imagemRepository.createMany.mock.calls[0];
    expect(persisted).toHaveLength(2);
    expect(persisted[0].lateralidadeOlho).toBe(LateralidadeOlho.OD);
    expect(persisted[0].caminhoImg).toBe(firstKey);
    expect(persisted[1].lateralidadeOlho).toBe(LateralidadeOlho.OE);
    expect(persisted[1].caminhoImg).toBe(secondKey);
    expect(persisted.every((p: Imagem) => p.qualidadeImg === 'Pendente')).toBe(true);

    expect(result.imagens).toEqual(
      persisted.map((p: Imagem) => ({
        id: p.id,
        idExame: p.idExame,
        lateralidadeOlho: p.lateralidadeOlho,
        qualidadeImg: p.qualidadeImg,
      })),
    );
    expect(result.imagens.every((i) => !('caminhoImg' in i))).toBe(true);
    expect(storageService.deleteByKey).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when exam does not exist', async () => {
    examRepository.findOne.mockResolvedValue(null);

    await expect(
      usecase.execute({
        examId: faker.string.uuid(),
        userId: faker.string.uuid(),
        imagens: [buildImageInput(LateralidadeOlho.OD)],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(storageService.uploadPrivate).not.toHaveBeenCalled();
    expect(imagemRepository.findMany).not.toHaveBeenCalled();
    expect(imagemRepository.createMany).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when user is not the exam owner', async () => {
    const exame = ExameBuilder.anExame().withIdUsuario(faker.string.uuid()).getData();
    examRepository.findOne.mockResolvedValue(exame);

    await expect(
      usecase.execute({
        examId: exame.id,
        userId: faker.string.uuid(),
        imagens: [buildImageInput(LateralidadeOlho.OD)],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(storageService.uploadPrivate).not.toHaveBeenCalled();
    expect(imagemRepository.createMany).not.toHaveBeenCalled();
  });

  it('should throw ConflictError when exam already has images', async () => {
    const userId = faker.string.uuid();
    const exame = ExameBuilder.anExame().withIdUsuario(userId).getData();

    const existingImagem: Imagem = {
      id: faker.string.uuid(),
      idExame: exame.id,
      lateralidadeOlho: LateralidadeOlho.OD,
      caminhoImg: `exams/${exame.id}/OD-existing.jpg`,
      qualidadeImg: 'Pendente',
    };

    examRepository.findOne.mockResolvedValue(exame);
    imagemRepository.findMany.mockResolvedValue([existingImagem]);

    await expect(
      usecase.execute({
        examId: exame.id,
        userId,
        imagens: [buildImageInput(LateralidadeOlho.OD)],
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(storageService.uploadPrivate).not.toHaveBeenCalled();
    expect(imagemRepository.createMany).not.toHaveBeenCalled();
  });

  it('should cleanup uploaded objects and rethrow when a subsequent upload fails', async () => {
    const userId = faker.string.uuid();
    const exame = ExameBuilder.anExame().withIdUsuario(userId).getData();

    examRepository.findOne.mockResolvedValue(exame);
    imagemRepository.findMany.mockResolvedValue([]);

    const uploadError = new Error('storage down');
    storageService.uploadPrivate
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(uploadError);
    storageService.deleteByKey.mockResolvedValue(undefined);

    await expect(
      usecase.execute({
        examId: exame.id,
        userId,
        imagens: [buildImageInput(LateralidadeOlho.OD), buildImageInput(LateralidadeOlho.OE)],
      }),
    ).rejects.toBe(uploadError);

    const firstUploadedKey = storageService.uploadPrivate.mock.calls[0][0].key;

    expect(storageService.deleteByKey).toHaveBeenCalledTimes(1);
    expect(storageService.deleteByKey).toHaveBeenCalledWith(firstUploadedKey, Buckets.examImages);
    expect(imagemRepository.createMany).not.toHaveBeenCalled();
  });
});
