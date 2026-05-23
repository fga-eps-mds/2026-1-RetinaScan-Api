import { randomUUID } from 'node:crypto';

import type { ExamesRepository } from '@/modules/exam/exam-repository';
import type { ExamIaErrorRepository } from '@/modules/exam/exam-ia-error-repository';
import { ExameStatus, type Exame } from '@/modules/exam/exam';
import type { ExamIaError, ExamIaErrorArgs } from '@/modules/exam/exam-ia-error';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import logger from '@/infra/logger';
import type { NotificationService } from '@/modules/notification/services';

export interface RegisterExamAiErrorUseCaseInput {
  examId: string;
  payloadExamId: string;
  errorMessage: string;
  traceback?: string;
  taskId?: string;
  taskName?: string;
  args?: ExamIaErrorArgs;
}

export class RegisterExamAiErrorUseCase {
  constructor(
    private readonly examesRepository: ExamesRepository,
    private readonly examIaErrorRepository: ExamIaErrorRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(input: RegisterExamAiErrorUseCaseInput): Promise<void> {
    const { examId, payloadExamId } = input;

    this.assertPayloadExamMatches(examId, payloadExamId);
    const exame = await this.getExam(examId);
    this.assertExamNotCompleted(exame);
    await this.assertNoPreviousError(examId);

    const erro = this.buildErrorPayload(input);
    await this.persistError(erro);
    await this.markExamAsErrored(examId);

    await this.notificationService.notificar({
      usuarioId: exame.idUsuario,
      titulo: 'Erro no processamento do exame',
      mensagem: `Ocorreu um erro durante o processamento do seu exame "${exame.nomeCompleto}". Nossa equipe já foi notificada e está trabalhando para resolver o problema o mais rápido possível. Agradecemos pela sua compreensão.`,
      tipo: 'avaliacao_ia_error',
      chaveDedupe: `exam_ai_error_${exame.id}`,
      dados: {
        examId: exame.id,
        errorMessage: input.errorMessage,
        traceback: input.traceback,
        taskId: input.taskId,
        taskName: input.taskName,
        args: input.args,
      },
    });
  }

  private assertPayloadExamMatches(examId: string, payloadExamId: string): void {
    if (examId !== payloadExamId) {
      logger.warn('Webhook de erro payload exam_id divergente do path', {
        examId,
        payloadExamId,
      });
      throw new ValidationError([
        { path: ['exam_id'], message: 'exam_id do payload não corresponde ao exame da rota' },
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

  private assertExamNotCompleted(exame: Exame): void {
    if (exame.status === ExameStatus.CONCLUIDO) {
      throw new ConflictError(
        'O exame já está concluído e não pode receber registro de erro de IA',
      );
    }
  }

  private async assertNoPreviousError(examId: string): Promise<void> {
    const exists = await this.examIaErrorRepository.existsByExamId({ examId });
    if (exists) {
      throw new ConflictError('O exame já possui registro de erro de IA');
    }
  }

  private buildErrorPayload(input: RegisterExamAiErrorUseCaseInput): ExamIaError {
    return {
      id: randomUUID(),
      idExame: input.examId,
      errorMessage: input.errorMessage,
      traceback: input.traceback ?? null,
      taskId: input.taskId ?? null,
      taskName: input.taskName ?? null,
      args: input.args ?? null,
      dtHora: new Date(),
    };
  }

  private async persistError(erro: ExamIaError): Promise<void> {
    await this.examIaErrorRepository.create({ erro });
  }

  private async markExamAsErrored(examId: string): Promise<void> {
    await this.examesRepository.update({
      examId,
      data: { status: ExameStatus.ERRO_PROCESSAMENTO },
    });
  }
}
