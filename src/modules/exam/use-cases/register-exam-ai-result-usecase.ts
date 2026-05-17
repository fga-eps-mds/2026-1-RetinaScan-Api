// TODO(hardening): rota chamada sem autenticação — adicionar HMAC/shared secret antes de produção.
import { randomUUID } from 'node:crypto';

import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import type { ResultadoIaRepository } from '@/modules/exam/resultado-ia-repository';
import { ExameStatus, type Exame } from '@/modules/exam/exam';
import type { Imagem } from '@/modules/exam/imagem';
import type { ResultadoIa } from '@/modules/exam/resultado-ia';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import logger from '@/infra/logger';

export interface AiResultProbabilities {
  [label: string]: number;
}

export interface RegisterExamAiResultItem {
  filename: string;
  contentType: string;
  predictedClass: number;
  predictedLabel: string;
  confidence: number;
  probabilities: AiResultProbabilities;
}

export interface RegisterExamAiResultUseCaseInput {
  examId: string;
  payloadExamId: string;
  totalImages: number;
  results: RegisterExamAiResultItem[];
}

export class RegisterExamAiResultUseCase {
  constructor(
    private readonly examesRepository: ExamesRepository,
    private readonly imagemRepository: ImagemRepository,
    private readonly resultadoIaRepository: ResultadoIaRepository,
  ) {}

  async execute(input: RegisterExamAiResultUseCaseInput): Promise<void> {
    const { examId, payloadExamId, totalImages, results } = input;

    this.assertPayloadExamMatches(examId, payloadExamId);
    this.assertTotalImagesConsistent(totalImages, results);

    await this.getExam(examId);
    await this.assertNoPreviousResults(examId);

    const imagens = await this.loadExamImages(examId);
    const imagemIdsByResult = this.matchResultsToImages(imagens, results);

    const resultados = this.buildResultPayloads(results, imagemIdsByResult);
    await this.persistResults(resultados);
    await this.markExamAsCompleted(examId);
  }

  private assertPayloadExamMatches(examId: string, payloadExamId: string): void {
    if (examId !== payloadExamId) {
      logger.warn('Webhook payload exam_id divergente do path', { examId, payloadExamId });
      throw new ValidationError([
        { path: ['exam_id'], message: 'exam_id do payload não corresponde ao exame da rota' },
      ]);
    }
  }

  private assertTotalImagesConsistent(
    totalImages: number,
    results: RegisterExamAiResultItem[],
  ): void {
    if (totalImages !== results.length) {
      throw new ValidationError([
        {
          path: ['total_images'],
          message: `total_images (${totalImages}) não corresponde à quantidade de results (${results.length})`,
        },
      ]);
    }
  }

  private async getExam(examId: string): Promise<Exame> {
    const exame = await this.examesRepository.findOne({ examId });
    if (!exame) {
      throw new NotFoundError('O exame não existe');
    }
    return exame;
  }

  private async assertNoPreviousResults(examId: string): Promise<void> {
    const exists = await this.resultadoIaRepository.existsByExamId({ examId });
    if (exists) {
      throw new ConflictError('O exame já possui resultados de IA registrados');
    }
  }

  private async loadExamImages(examId: string): Promise<Imagem[]> {
    return this.imagemRepository.findMany({ examId });
  }

  private matchResultsToImages(imagens: Imagem[], results: RegisterExamAiResultItem[]): string[] {
    if (imagens.length !== results.length) {
      throw new ValidationError([
        {
          path: ['results'],
          message: `Quantidade de results (${results.length}) diverge das imagens do exame (${imagens.length})`,
        },
      ]);
    }

    const imagemByKey = new Map(imagens.map((img) => [img.caminhoImg, img] as const));
    const seen = new Set<string>();
    const imagemIds: string[] = [];

    for (const [index, result] of results.entries()) {
      const imagem = imagemByKey.get(result.filename);
      if (!imagem) {
        throw new ValidationError([
          {
            path: ['results', index, 'filename'],
            message: `Filename não corresponde a nenhuma imagem do exame: ${result.filename}`,
          },
        ]);
      }

      if (seen.has(imagem.id)) {
        throw new ValidationError([
          {
            path: ['results', index, 'filename'],
            message: `Filename duplicado para imagem: ${result.filename}`,
          },
        ]);
      }
      seen.add(imagem.id);
      imagemIds.push(imagem.id);
    }

    return imagemIds;
  }

  private buildResultPayloads(
    results: RegisterExamAiResultItem[],
    imagemIds: string[],
  ): ResultadoIa[] {
    return results.map((result, index) => ({
      id: randomUUID(),
      idImagem: imagemIds[index],
      predictedClass: result.predictedClass,
      predictedLabel: result.predictedLabel,
      confidence: result.confidence,
      probabilities: result.probabilities,
    }));
  }

  private async persistResults(resultados: ResultadoIa[]): Promise<void> {
    await this.resultadoIaRepository.createMany({ resultados });
  }

  private async markExamAsCompleted(examId: string): Promise<void> {
    await this.examesRepository.update({
      examId,
      data: { status: ExameStatus.CONCLUIDO },
    });
  }
}
