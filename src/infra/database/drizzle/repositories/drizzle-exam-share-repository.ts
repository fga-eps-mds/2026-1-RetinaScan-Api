import { db } from '@/infra/database/drizzle/connection';
import { examShare } from '@/infra/database/drizzle/schema';
import type { ExamShare, CreateExamShareInput, ExamShareRepository } from '@/modules/exam';
import { and, eq } from 'drizzle-orm';

export class DrizzleExamShareRepository implements ExamShareRepository {
  async create(input: CreateExamShareInput): Promise<ExamShare> {
    const result = await db
      .insert(examShare)
      .values({
        examId: input.examId,
        medicoDestinoId: input.medicoDestinoId,
        compartilhadoPor: input.compartilhadoPor,
        expiraEm: input.expiraEm,
      })
      .returning();

    return result[0];
  }

  async findById(id: string): Promise<ExamShare | null> {
    const result = await db.select().from(examShare).where(eq(examShare.id, id)).limit(1);

    return result[0] || null;
  }

  async findByExamAndMedico(examId: string, medicoDestinoId: string): Promise<ExamShare | null> {
    const result = await db
      .select()
      .from(examShare)
      .where(and(eq(examShare.examId, examId), eq(examShare.medicoDestinoId, medicoDestinoId)))
      .limit(1);

    return result[0] || null;
  }

  async listActiveByExam(examId: string): Promise<ExamShare[]> {
    return db
      .select()
      .from(examShare)
      .where(and(eq(examShare.examId, examId), eq(examShare.ativo, true)));
  }

  async revoke(id: string): Promise<void> {
    await db.update(examShare).set({ ativo: false }).where(eq(examShare.id, id));
  }
}
