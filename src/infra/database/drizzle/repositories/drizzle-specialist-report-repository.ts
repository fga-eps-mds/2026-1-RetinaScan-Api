import type { SpecialistReport } from '@/modules/exam/specialist-report';
import type {
  CreateSpecialistReportInput,
  SpecialistReportRepository,
  UpdateSpecialistReportInput,
} from '@/modules/exam/specialist-report-repository';
import { db } from '../connection';
import { eq } from 'drizzle-orm';
import { specialistReport } from '../schema';

export class DrizzleSpecialistReportRepository implements SpecialistReportRepository {
  async findByExamId(examId: string): Promise<SpecialistReport | null> {
    const report = await db.query.specialistReport.findFirst({
      where: eq(specialistReport.examId, examId),
    });

    if (!report) return null;

    return report;
  }

  async create(data: CreateSpecialistReportInput): Promise<SpecialistReport> {
    const [report] = await db
      .insert(specialistReport)
      .values({
        examId: data.examId,
        specialistId: data.especialistId,
        texto: data.texto,
        resultadoIaValido: Boolean(data.resultadoIAValido),
      })
      .returning();

    return report;
  }

  async update(examId: string, data: UpdateSpecialistReportInput): Promise<SpecialistReport> {
    const [report] = await db
      .update(specialistReport)
      .set({
        texto: data.texto,
        resultadoIaValido: Boolean(data.resultadoIAValido),
      })
      .where(eq(specialistReport.examId, examId))
      .returning();

    return report;
  }
}
