import { and, count, desc, eq, ilike, type SQL } from 'drizzle-orm';

import { db } from '@/infra/database/drizzle/connection';
import { exam } from '@/infra/database/drizzle/schema';
import type { Exame, ExameStatus, OlhoExame, Sexo } from '@/modules/exam/exam';
import type {
  ExameListItem,
  ExamesRepository,
  FindExamInput,
  FindManyExamsInput,
  FindManyExamsResult,
  UpdateExamInput,
} from '@/modules/exam/exam-repository';

type ExamRow = typeof exam.$inferSelect;

function toExame(row: ExamRow): Exame {
  return {
    id: row.idExame,
    idUsuario: row.idUsuario,
    nomeCompleto: row.nomeCompleto,
    cpf: row.cpf,
    dtNascimento: row.dtNascimento,
    sexo: row.sexo as Sexo,
    dtHora: row.dtHora,
    status: row.status as ExameStatus,
    olho: row.olho as OlhoExame | null,
    comorbidades: row.comorbidades,
    descricao: row.descricao,
  };
}

export class DrizzleExamesRepository implements ExamesRepository {
  async create(input: Exame): Promise<Exame> {
    const [row] = await db
      .insert(exam)
      .values({
        idExame: input.id,
        idUsuario: input.idUsuario,
        nomeCompleto: input.nomeCompleto,
        cpf: input.cpf,
        dtNascimento: input.dtNascimento,
        sexo: input.sexo,
        dtHora: input.dtHora,
        status: input.status,
        olho: input.olho ?? null,
        comorbidades: input.comorbidades ?? null,
        descricao: input.descricao ?? null,
      })
      .returning();

    return toExame(row);
  }

  async findOne({ examId }: FindExamInput): Promise<Exame | null> {
    const rows = await db.select().from(exam).where(eq(exam.idExame, examId)).limit(1);

    if (rows.length === 0) return null;

    return toExame(rows[0]);
  }

  async findMany({ filters, pagination }: FindManyExamsInput): Promise<FindManyExamsResult> {

    const conditions: SQL[] = [];

    if (filters.idUsuario) {
      conditions.push(eq(exam.idUsuario, filters.idUsuario));
    }

    if (filters.cpf) {
      conditions.push(eq(exam.cpf, filters.cpf));
    }

    if (filters.nomeCompleto) {
      conditions.push(ilike(exam.nomeCompleto, `%${filters.nomeCompleto}%`));
    }

    const whereClause = and(...conditions);
    const offset = (pagination.page - 1) * pagination.pageSize;

    const rowsPromise = db
      .select()
      .from(exam)
      .where(whereClause)
      .orderBy(desc(exam.createdAt))
      .limit(pagination.pageSize)
      .offset(offset);

    const totalPromise = db.select({ value: count() }).from(exam).where(whereClause);

    const [rows, totalRows] = await Promise.all([rowsPromise, totalPromise]);

    const data: ExameListItem[] = rows.map((row) => ({
      id: row.idExame,
      nomeCompleto: row.nomeCompleto,
      olho: row.olho as OlhoExame | null,
      status: row.status as ExameStatus,
      dtCriacao: row.createdAt,
    }));

    return { data, total: Number(totalRows[0].value) };
  }

  async update({ examId, data }: UpdateExamInput): Promise<void> {
    if (Object.keys(data).length === 0) return;
    await db.update(exam).set(data).where(eq(exam.idExame, examId));
  }
}
