import { randomUUID } from 'node:crypto';
import { Buckets, type DicomService, type StorageService } from '@/shared/services';
import type { DicomMetadata } from '@/shared/services/dicom-service';
import { LateralidadeOlho } from '@/modules/exam/imagem';
import { detectFileType } from '@/modules/exam/file-type';
import { ValidationError } from '@/shared/errors';
import logger from '@/infra/logger';

const FIELD_TO_LATERALIDADE: Record<string, LateralidadeOlho | undefined> = {
  olhoDireito: LateralidadeOlho.OD,
  olhoEsquerdo: LateralidadeOlho.OE,
};

export interface ProcessExamUploadFile {
  field: string;
  buffer: Buffer;
}
export interface ProcessExamUploadUseCaseInput {
  userId: string;
  arquivos: ProcessExamUploadFile[];
}
export interface UploadedImageRef {
  uploadId: string;
  urlPreview: string;
  lateralidade?: LateralidadeOlho;
}
export interface ProcessExamUploadUseCaseOutput {
  metadados?: DicomMetadata;
  imagens: UploadedImageRef[];
}

interface ProcessedFile {
  uploadId: string;
  key: string;
  lateralidade?: LateralidadeOlho;
  metadata?: DicomMetadata;
}

const PREVIEW_TTL_SECONDS = 60 * 15;

export class ProcessExamUploadUseCase {
  constructor(
    private readonly storageService: StorageService,
    private readonly dicomService: DicomService,
  ) {}

  /**
   * Sobe as imagens (DICOM/JPEG/PNG) para a área temporária `pending/`, extraindo e
   * consolidando metadados dos DICOMs. Upload em lote é tudo-ou-nada: falha em qualquer
   * arquivo faz rollback dos que já subiram.
   *
   * @throws ValidationError sem arquivos, campo de origem desconhecido ou formato não suportado
   */
  async execute(input: ProcessExamUploadUseCaseInput): Promise<ProcessExamUploadUseCaseOutput> {
    this.assertHasFiles(input.arquivos);
    const uploadedKeys: string[] = [];
    try {
      const processed: ProcessedFile[] = [];
      for (const arquivo of input.arquivos) {
        const result = await this.processOne(input.userId, arquivo);
        uploadedKeys.push(result.key);
        processed.push(result);
      }
      return {
        metadados: this.consolidateMetadata(processed),
        imagens: await this.buildRefs(processed),
      };
    } catch (error) {
      logger.error('Erro no processamento de upload, iniciando rollback', { error });
      await this.rollback(uploadedKeys);
      throw error;
    }
  }

  private assertHasFiles(arquivos: ProcessExamUploadFile[]): void {
    if (arquivos.length === 0) {
      throw new ValidationError(
        [{ path: ['imagens'], message: 'Envie pelo menos uma imagem.' }],
        true,
      );
    }
  }

  private async processOne(userId: string, arquivo: ProcessExamUploadFile): Promise<ProcessedFile> {
    const lateralidadeCampo = FIELD_TO_LATERALIDADE[arquivo.field];
    if (!lateralidadeCampo) {
      throw new ValidationError(
        [{ path: [arquivo.field], message: 'Campo de arquivo inválido.' }],
        true,
      );
    }
    const tipo = detectFileType(arquivo.buffer);
    const uploadId = randomUUID();
    const key = `pending/${userId}/${uploadId}.jpg`;

    if (tipo === 'dicom') {
      const extracted = await this.dicomService.extract(arquivo.buffer);
      await this.storageService.uploadPrivate(
        { key, buffer: extracted.jpeg, contentType: 'image/jpeg' },
        Buckets.examImages,
      );
      return {
        uploadId,
        key,
        lateralidade: extracted.lateralidade ?? lateralidadeCampo,
        metadata: extracted.metadata,
      };
    }
    if (tipo === 'jpeg' || tipo === 'png') {
      const contentType = tipo === 'jpeg' ? 'image/jpeg' : 'image/png';
      await this.storageService.uploadPrivate(
        { key, buffer: arquivo.buffer, contentType },
        Buckets.examImages,
      );
      return { uploadId, key, lateralidade: lateralidadeCampo };
    }
    throw new ValidationError(
      [{ path: [arquivo.field], message: 'Formato de arquivo inválido.' }],
      true,
    );
  }

  private consolidateMetadata(processed: ProcessedFile[]): DicomMetadata | undefined {
    const comDicom = processed.filter((p) => p.metadata !== undefined);
    if (comDicom.length === 0) return undefined;
    const consolidated: DicomMetadata = {};
    const campos: (keyof DicomMetadata)[] = [
      'nomeCompleto',
      'sexo',
      'dtNascimento',
      'dtHora',
      'descricao',
    ];
    for (const campo of campos) {
      for (const p of comDicom) {
        const valor = p.metadata?.[campo];
        if (valor !== undefined && consolidated[campo] === undefined) {
          (consolidated as Record<string, unknown>)[campo] = valor;
        }
      }
    }
    return consolidated;
  }

  private async buildRefs(processed: ProcessedFile[]): Promise<UploadedImageRef[]> {
    return Promise.all(
      processed.map(async (p) => ({
        uploadId: p.uploadId,
        urlPreview: await this.storageService.getPresignedUrl({
          key: p.key,
          bucket: Buckets.examImages,
          expiresInSeconds: PREVIEW_TTL_SECONDS,
        }),
        lateralidade: p.lateralidade,
      })),
    );
  }

  private async rollback(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.storageService.deleteByKey(key, Buckets.examImages);
    }
  }
}
