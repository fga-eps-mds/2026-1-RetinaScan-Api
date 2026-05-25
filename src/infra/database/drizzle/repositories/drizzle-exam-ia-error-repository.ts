import { eq } from 'drizzle-orm';

import { db } from '@/infra/database/drizzle/connection';
import { examIaError } from '@/infra/database/drizzle/schema';
import type {
  CreateExamIaErrorInput,
  ExamIaErrorRepository,
  ExistsExamIaErrorByExamInput,
} from '@/modules/exam/exam-ia-error-repository';

export class DrizzleExamIaErrorRepository implements ExamIaErrorRepository {
  async create({ erro }: CreateExamIaErrorInput): Promise<void> {
    await db.insert(examIaError).values({
      idExamIaError: erro.id,
      idExame: erro.idExame,
      errorMessage: erro.errorMessage,
      traceback: erro.traceback ?? null,
      taskId: erro.taskId ?? null,
      taskName: erro.taskName ?? null,
      args: erro.args ?? null,
      dtHora: erro.dtHora,
    });
  }

  async existsByExamId({ examId }: ExistsExamIaErrorByExamInput): Promise<boolean> {
    const rows = await db
      .select({ id: examIaError.idExamIaError })
      .from(examIaError)
      .where(eq(examIaError.idExame, examId))
      .limit(1);

    return rows.length > 0;
  }
}
