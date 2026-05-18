import { randomUUID } from 'node:crypto';
import { ExameStatus, type Exame, type OlhoExame } from '@/modules/exam/exam';
import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import { LateralidadeOlho, QualidadeImagem, type Imagem } from '@/modules/exam/imagem';
import { Buckets, type MessageBroker, type StorageService } from '@/shared/services';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { QueueNames } from '@/infra/queue/types';
import type { ProcessImagesJobData } from '@/infra/queue/workers/process-images-worker';
import logger from '@/infra/logger';

export interface UploadExamImageInput {
  lateralidade: LateralidadeOlho;
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png';
  extension: 'jpg' | 'jpeg' | 'png';
}

export interface UploadExamImagesUseCaseInput {
  examId: string;
  userId: string;
  imagens: UploadExamImageInput[];
}

export interface UploadedImagemDto {
  id: string;
  idExame: string;
  lateralidadeOlho: LateralidadeOlho;
  qualidadeImg: string;
}

export interface UploadExamImagesUseCaseOutput {
  imagens: UploadedImagemDto[];
}

function toUploadedImagemDto(imagem: Imagem): UploadedImagemDto {
  return {
    id: imagem.id,
    idExame: imagem.idExame,
    lateralidadeOlho: imagem.lateralidadeOlho,
    qualidadeImg: imagem.qualidadeImg,
  };
}

interface ImageUploadItem {
  id: string;
  lateralidade: LateralidadeOlho;
  objectKey: string;
  buffer: Buffer;
  contentType: string;
}

export class UploadExamImagesUseCase {
  constructor(
    private readonly examRepository: ExamesRepository,
    private readonly imagemRepository: ImagemRepository,
    private readonly storageService: StorageService,
    private readonly messageBroker: MessageBroker,
  ) {}

  async execute(input: UploadExamImagesUseCaseInput): Promise<UploadExamImagesUseCaseOutput> {
    const { examId, userId, imagens } = input;

    const exame = await this.getExam(examId);
    this.assertOwnership(exame, userId);
    await this.assertNoImages(examId);

    const prepared = this.buildImagePayloads(examId, imagens);
    await this.uploadAll(prepared);

    const created = await this.createImages(examId, prepared);
    await this.updateExamOlho(examId, created);
    await this.publishAnalysisJob(examId, created);
    await this.markExamAsProcessing(examId);

    return { imagens: created.map(toUploadedImagemDto) };
  }

  private async markExamAsProcessing(examId: string): Promise<void> {
    await this.examRepository.update({
      examId,
      data: { status: ExameStatus.EM_PROCESSAMENTO },
    });
  }

  private async updateExamOlho(examId: string, imagens: Imagem[]): Promise<void> {
    const olho = this.resolveOlho(imagens);
    await this.examRepository.update({ examId, data: { olho } });
  }

  private async publishAnalysisJob(examId: string, imagens: Imagem[]): Promise<void> {
    if (imagens.length === 0) return;

    const od = imagens.find((img) => img.lateralidadeOlho === LateralidadeOlho.OD);
    const oe = imagens.find((img) => img.lateralidadeOlho === LateralidadeOlho.OE);

    const payload: ProcessImagesJobData = {
      examId,
      leftImageKey: oe?.caminhoImg,
      rightImageKey: od?.caminhoImg,
    };

    await this.messageBroker.publish({ queueName: QueueNames.processImages, payload });
  }

  private resolveOlho(imagens: Imagem[]): OlhoExame {
    const hasOD = imagens.some((img) => img.lateralidadeOlho === LateralidadeOlho.OD);
    const hasOE = imagens.some((img) => img.lateralidadeOlho === LateralidadeOlho.OE);
    if (hasOD && hasOE) return 'AO';
    if (hasOD) return 'OD';
    return 'OE';
  }

  private async getExam(examId: string): Promise<Exame> {
    const exame = await this.examRepository.findOne({ examId });

    if (!exame) {
      throw new NotFoundError('O exame não existe');
    }

    return exame;
  }

  private assertOwnership(exame: Exame, userId: string): void {
    if (exame.idUsuario !== userId) {
      logger.warn('User is not the owner of the exam', { userId, examId: exame.id });
      throw new NotFoundError('O exame não existe');
    }
  }

  private async assertNoImages(examId: string): Promise<void> {
    const existing = await this.imagemRepository.findMany({ examId });

    if (existing.length > 0) {
      throw new ConflictError('O exame já possui imagens');
    }
  }

  private buildImagePayloads(examId: string, imagens: UploadExamImageInput[]): ImageUploadItem[] {
    return imagens.map((img) => {
      const id = randomUUID();
      return {
        id,
        lateralidade: img.lateralidade,
        objectKey: `exams/${examId}/${img.lateralidade}-${id}.${img.extension}`,
        buffer: img.buffer,
        contentType: img.contentType,
      };
    });
  }

  private async uploadAll(prepared: ImageUploadItem[]): Promise<void> {
    const uploadedKeys: string[] = [];

    try {
      for (const item of prepared) {
        await this.storageService.uploadPrivate(
          { key: item.objectKey, buffer: item.buffer, contentType: item.contentType },
          Buckets.examImages,
        );
        uploadedKeys.push(item.objectKey);
      }
    } catch (error) {
      logger.error('Error while uploading exam images, starting rollback', { error });
      await this.rollback(uploadedKeys);
      throw error;
    }
  }

  private async rollback(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.storageService.deleteByKey(key, Buckets.examImages);
    }
  }

  private async createImages(examId: string, prepared: ImageUploadItem[]): Promise<Imagem[]> {
    const images: Imagem[] = prepared.map((item) => ({
      id: item.id,
      idExame: examId,
      lateralidadeOlho: item.lateralidade,
      caminhoImg: item.objectKey,
      qualidadeImg: QualidadeImagem.Pendente,
    }));

    return this.imagemRepository.createMany(images);
  }
}
