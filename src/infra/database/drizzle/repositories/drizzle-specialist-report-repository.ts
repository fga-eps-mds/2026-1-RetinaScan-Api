import type { SpecialistReport, SpecialistReportDTO } from '@/modules/exam/specialist-report';
import type {
  CreateSpecialistReportInput,
  SpecialistReportRepository,
  UpdateSpecialistReportInput,
} from '@/modules/exam/specialist-report-repository';
import { db } from '../connection';
import { eq } from 'drizzle-orm';
import { specialistReport, usuario } from '../schema';
import { NotFoundError } from '@/shared/errors';

export class DrizzleSpecialistReportRepository implements SpecialistReportRepository {
  async findByExamId(examId: string): Promise<SpecialistReportDTO | null> {
    const report = await db.query.specialistReport.findFirst({
      where: eq(specialistReport.examId, examId),
    });

    if (!report) {
      return null;
    }

    const specialist = await db.query.usuario.findFirst({
      where: eq(usuario.id, report.specialistId),
      columns: {
        id: true,
        nomeCompleto: true,
      },
    });

    if (!specialist) {
      throw new Error(`Especialista com id ${report.specialistId} não encontrado.`);
    }

    return {
      ...report,
      specialist,
      conteudo: JSON.stringify(report.conteudo),
    };
  }

  async create(data: CreateSpecialistReportInput): Promise<SpecialistReport> {
    const [report] = await db
      .insert(specialistReport)
      .values({
        examId: data.examId,
        specialistId: data.especialistId,
        texto: data.texto,
        html: data.html,
        conteudo: data.conteudo,
        resultadoIaValido: Boolean(data.resultadoIaValido),
      })
      .returning();

    return {
      ...report,
      conteudo: JSON.stringify(report.conteudo),
    };
  }

  async update(reportId: string, data: UpdateSpecialistReportInput): Promise<SpecialistReport> {
    const [report] = await db
      .update(specialistReport)
      .set({
        texto: data.texto,
        resultadoIaValido: Boolean(data.resultadoIaValido),
        html: data.html,
        conteudo: data.conteudo,
      })
      .where(eq(specialistReport.id, reportId))
      .returning();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!report) {
      throw new NotFoundError(`Specialist report com id ${reportId} não encontrado.`);
    }

    return {
      ...report,
      conteudo: JSON.stringify(report.conteudo),
    };
  }
}
