import { randomUUID } from 'node:crypto';
import type { UsuariosRepository } from '@/modules/users/repositories';
import {
  type Exame,
  ExameStatus,
  type ExamesRepository,
  type OlhoExame,
  type Sexo,
} from '@/modules/exam';
import type { ImagemRepository } from '@/modules/exam/imagem-repository';
import { LateralidadeOlho, QualidadeImagem, type Imagem } from '@/modules/exam/imagem';
import {
  Buckets,
  type CryptographyService,
  type MessageBroker,
  type StorageService,
} from '@/shared/services';
import { NotFoundError } from '@/shared/errors';
import { QueueNames } from '@/infra/queue/types';
import type { ProcessImagesJobData } from '@/infra/queue/workers/process-images-worker';
import logger from '@/infra/logger';

export type ExamComorbidadesInput = {
  diabetes: boolean;
  diabetesAnos?: number;
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
  outrasComorbidadesDescricao?: string;
  qualidadeTecnicaDificuldade: boolean;
};

export interface CreateExamImageInput {
  uploadId: string;
  lateralidade: LateralidadeOlho;
}

export type CreateExamUseCaseInput = {
  idUsuario: string;
  nomeCompleto: string;
  cpf: string;
  sexo: Sexo;
  dtNascimento: string;
  dtHora: Date;
  comorbidades: ExamComorbidadesInput;
  descricao?: string;
  imagens: CreateExamImageInput[];
};

export type CreateExamUseCaseOutput = Exame;

interface AdoptedImage {
  id: string;
  lateralidade: LateralidadeOlho;
  destinationKey: string;
}

export class CreateExamUseCase {
  constructor(
    private readonly userRepository: UsuariosRepository,
    private readonly examRepository: ExamesRepository,
    private readonly cryptographyService: CryptographyService,
    private readonly imagemRepository: ImagemRepository,
    private readonly storageService: StorageService,
    private readonly messageBroker: MessageBroker,
  ) {}

  /**
   * Cria um exame a partir de uploads já feitos em `pending/`: "adota" as imagens para a
   * pasta definitiva do exame, persiste exame + comorbidades (com dados sensíveis
   * criptografados) e enfileira o job de análise de IA. Os uploads adotados são revertidos
   * no storage se a persistência falhar.
   *
   * @throws NotFoundError se o usuário não existe ou se algum upload referenciado não está em `pending/`
   */
  async execute(input: CreateExamUseCaseInput): Promise<CreateExamUseCaseOutput> {
    await this.validateUserExists(input.idUsuario);
    await this.assertUploadsOwnership(input.idUsuario, input.imagens);

    const examId = randomUUID();
    const adopted = await this.adoptImages(examId, input.idUsuario, input.imagens);

    try {
      const exam = await this.persistExam(examId, input, adopted);
      await this.createImageRows(examId, adopted);
      await this.publishAnalysisJob(examId, adopted);
      return exam;
    } catch (error) {
      logger.error('Erro ao criar exame, revertendo imagens adotadas', { error });
      await this.rollbackAdopted(adopted);
      throw error;
    }
  }

  private async validateUserExists(idUsuario: string): Promise<void> {
    const user = await this.userRepository.findBy({ id: idUsuario });
    if (!user) throw new NotFoundError('Usuário não encontrado');
  }

  private async assertUploadsOwnership(
    userId: string,
    imagens: CreateExamImageInput[],
  ): Promise<void> {
    for (const img of imagens) {
      const exists = await this.storageService.objectExists(
        this.pendingKey(userId, img.uploadId),
        Buckets.examImages,
      );
      if (!exists) throw new NotFoundError('Upload não encontrado');
    }
  }

  private async adoptImages(
    examId: string,
    userId: string,
    imagens: CreateExamImageInput[],
  ): Promise<AdoptedImage[]> {
    const adopted: AdoptedImage[] = [];
    try {
      for (const img of imagens) {
        const id = randomUUID();
        const destinationKey = `exams/${examId}/${img.lateralidade}-${id}.jpg`;
        await this.storageService.copy(
          { sourceKey: this.pendingKey(userId, img.uploadId), destinationKey },
          Buckets.examImages,
        );
        adopted.push({ id, lateralidade: img.lateralidade, destinationKey });
      }
    } catch (error) {
      await this.rollbackAdopted(adopted);
      throw error;
    }

    await Promise.all(
      imagens.map((img) =>
        this.storageService
          .deleteByKey(this.pendingKey(userId, img.uploadId), Buckets.examImages)
          .catch(() => undefined),
      ),
    );
    return adopted;
  }

  private async persistExam(
    examId: string,
    input: CreateExamUseCaseInput,
    adopted: AdoptedImage[],
  ): Promise<Exame> {
    const exam: Exame = this.anonimizeExamData({
      id: examId,
      idUsuario: input.idUsuario,
      nomeCompleto: input.nomeCompleto,
      cpf: input.cpf,
      sexo: input.sexo,
      dtNascimento: input.dtNascimento,
      dtHora: input.dtHora,
      status: ExameStatus.EM_PROCESSAMENTO,
      olho: this.resolveOlho(adopted),
      descricao: input.descricao,
    });
    const comorbidades = this.anonimizeComorbidadesData({ idExame: examId, ...input.comorbidades });
    return this.examRepository.createWithComorbidity({ exam, comorbidades });
  }

  private async createImageRows(examId: string, adopted: AdoptedImage[]): Promise<void> {
    const images: Imagem[] = adopted.map((a) => ({
      id: a.id,
      idExame: examId,
      lateralidadeOlho: a.lateralidade,
      caminhoImg: a.destinationKey,
      qualidadeImg: QualidadeImagem.Pendente,
    }));
    await this.imagemRepository.createMany(images);
  }

  private async publishAnalysisJob(examId: string, adopted: AdoptedImage[]): Promise<void> {
    if (adopted.length === 0) return;
    const od = adopted.find((a) => a.lateralidade === LateralidadeOlho.OD);
    const oe = adopted.find((a) => a.lateralidade === LateralidadeOlho.OE);
    const payload: ProcessImagesJobData = {
      examId,
      leftImageKey: oe?.destinationKey,
      rightImageKey: od?.destinationKey,
    };
    await this.messageBroker.publish({ queueName: QueueNames.processImages, payload });
  }

  private resolveOlho(adopted: AdoptedImage[]): OlhoExame {
    const hasOD = adopted.some((a) => a.lateralidade === LateralidadeOlho.OD);
    const hasOE = adopted.some((a) => a.lateralidade === LateralidadeOlho.OE);
    if (hasOD && hasOE) return 'AO';
    if (hasOD) return 'OD';
    return 'OE';
  }

  private async rollbackAdopted(adopted: AdoptedImage[]): Promise<void> {
    for (const a of adopted) {
      await this.storageService
        .deleteByKey(a.destinationKey, Buckets.examImages)
        .catch(() => undefined);
    }
  }

  private pendingKey(userId: string, uploadId: string): string {
    return `pending/${userId}/${uploadId}.jpg`;
  }

  private anonimizeExamData(exam: Exame): Exame {
    return {
      ...exam,
      dtNascimento: this.encrypt(exam.dtNascimento),
      descricao: exam.descricao ? this.encrypt(exam.descricao) : exam.descricao,
    };
  }

  private anonimizeComorbidadesData(comorbidades: { idExame: string } & ExamComorbidadesInput) {
    return {
      ...comorbidades,
      outrasComorbidadesDescricao: comorbidades.outrasComorbidadesDescricao
        ? this.encrypt(comorbidades.outrasComorbidadesDescricao)
        : comorbidades.outrasComorbidadesDescricao,
    };
  }

  private encrypt(text: string): string {
    return this.cryptographyService.encrypt({ text }).encryptedText;
  }
}
