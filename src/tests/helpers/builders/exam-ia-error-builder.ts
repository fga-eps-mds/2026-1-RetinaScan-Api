import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';

import { db } from '@/infra/database/drizzle/connection';
import { exam, examIaError } from '@/infra/database/drizzle/schema';
import type { ExamIaError, ExamIaErrorArgs } from '@/modules/exam/exam-ia-error';

import { ExameBuilder } from './exame-builder';

export class ExamIaErrorBuilder {
  private readonly data: ExamIaError;
  private readonly database: typeof db;

  private constructor() {
    this.database = db;

    this.data = {
      id: faker.string.uuid(),
      idExame: faker.string.uuid(),
      errorMessage: `TimeoutError('${faker.lorem.sentence()}')`,
      traceback: faker.lorem.paragraph(),
      taskId: faker.string.uuid(),
      taskName: 'process_exam_task',
      args: { exam_id: faker.string.uuid(), priority: 'high' },
      dtHora: new Date(),
    };
  }

  public static anExamIaError(): ExamIaErrorBuilder {
    return new ExamIaErrorBuilder();
  }

  public withId(id: string): this {
    this.data.id = id;
    return this;
  }

  public withIdExame(idExame: string): this {
    this.data.idExame = idExame;
    return this;
  }

  public withErrorMessage(errorMessage: string): this {
    this.data.errorMessage = errorMessage;
    return this;
  }

  public withTraceback(traceback: string | null): this {
    this.data.traceback = traceback;
    return this;
  }

  public withTaskId(taskId: string | null): this {
    this.data.taskId = taskId;
    return this;
  }

  public withTaskName(taskName: string | null): this {
    this.data.taskName = taskName;
    return this;
  }

  public withArgs(args: ExamIaErrorArgs | null): this {
    this.data.args = args;
    return this;
  }

  public async build(): Promise<ExamIaError> {
    await this.ensureExame();

    await this.database.insert(examIaError).values({
      idExamIaError: this.data.id,
      idExame: this.data.idExame,
      errorMessage: this.data.errorMessage,
      traceback: this.data.traceback ?? null,
      taskId: this.data.taskId ?? null,
      taskName: this.data.taskName ?? null,
      args: this.data.args ?? null,
      dtHora: this.data.dtHora,
    });

    return this.data;
  }

  public getData(): ExamIaError {
    return this.data;
  }

  private async ensureExame(): Promise<void> {
    const existing = await this.database
      .select({ id: exam.idExame })
      .from(exam)
      .where(eq(exam.idExame, this.data.idExame))
      .limit(1);

    if (existing.length) return;

    const created = await ExameBuilder.anExame().build();
    this.data.idExame = created.id;
  }
}
