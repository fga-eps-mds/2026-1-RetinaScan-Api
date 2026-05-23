import { eq } from 'drizzle-orm';

import { db } from '@/infra/database/drizzle/connection';
import { examComorbidity } from '@/infra/database/drizzle/schema';
import type { Comorbidade } from '@/modules/exam/exam';
import type {
  ComorbidadeRepository,
  FindComorbidadeByExamInput,
} from '@/modules/exam/comorbidade-repository';

type ComorbidadeRow = typeof examComorbidity.$inferSelect;

function toComorbidade(row: ComorbidadeRow): Comorbidade {
  return {
    idExame: row.idExame,
    diabetes: row.diabetes,
    diabetesAnos: row.diabetesAnos,
    diabetesUsoInsulina: row.diabetesUsoInsulina,
    diabetesControlado: row.diabetesControlado,
    hipertensao: row.hipertensao,
    hipertensaoControlada: row.hipertensaoControlada,
    altaMiopia: row.altaMiopia,
    glaucoma: row.glaucoma,
    usoHidroxicloroquina: row.usoHidroxicloroquina,
    uveite: row.uveite,
    catarata: row.catarata,
    outrasComorbidades: row.outrasComorbidades,
    outrasComorbidadesDescricao: row.outrasComorbidadesDescricao,
    qualidadeTecnicaDificuldade: row.qualidadeTecnicaDificuldade,
  };
}

export class DrizzleComorbidadeRepository implements ComorbidadeRepository {
  async findByExamId({ examId }: FindComorbidadeByExamInput): Promise<Comorbidade | null> {
    const rows = await db
      .select()
      .from(examComorbidity)
      .where(eq(examComorbidity.idExame, examId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return toComorbidade(rows[0]);
  }
}
