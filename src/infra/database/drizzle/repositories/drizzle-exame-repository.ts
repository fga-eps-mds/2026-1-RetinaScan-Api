import { db } from '@/infra/database/drizzle/connection';
import { exam } from '@/infra/database/drizzle/schema';
import type { Exame, ExameStatus, Sexo } from '@/modules/exam/exam';
import type { ExamesRepository } from '@/modules/exam/exam-repository';

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
        comorbidades: input.comorbidades ?? null,
        descricao: input.descricao ?? null,
      })
      .returning();

    return {
      id: row.idExame,
      idUsuario: row.idUsuario,
      nomeCompleto: row.nomeCompleto,
      cpf: row.cpf,
      dtNascimento: row.dtNascimento,
      sexo: row.sexo as Sexo,
      dtHora: row.dtHora,
      status: row.status as ExameStatus,
      comorbidades: row.comorbidades,
      descricao: row.descricao,
    };
  }
}
