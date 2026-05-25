import { eq } from 'drizzle-orm';

import { db } from '@/infra/database/drizzle/connection';
import { imagem, resultadoIa } from '@/infra/database/drizzle/schema';
import type { Probabilities, ResultadoIa } from '@/modules/exam/resultado-ia';
import type {
  CreateResultadosIaInput,
  ExistsResultadosIaByExamInput,
  FindResultadosIaByExamInput,
  ResultadoIaRepository,
} from '@/modules/exam/resultado-ia-repository';

export class DrizzleResultadoIaRepository implements ResultadoIaRepository {
  async createMany({ resultados }: CreateResultadosIaInput): Promise<void> {
    if (resultados.length === 0) return;

    await db.insert(resultadoIa).values(
      resultados.map((resultado) => ({
        idResultadoIa: resultado.id,
        idImagem: resultado.idImagem,
        predictedClass: resultado.predictedClass,
        predictedLabel: resultado.predictedLabel,
        confidence: resultado.confidence,
        probabilities: resultado.probabilities,
      })),
    );
  }

  async existsByExamId({ examId }: ExistsResultadosIaByExamInput): Promise<boolean> {
    const rows = await db
      .select({ id: resultadoIa.idResultadoIa })
      .from(resultadoIa)
      .innerJoin(imagem, eq(resultadoIa.idImagem, imagem.idImagem))
      .where(eq(imagem.idExame, examId))
      .limit(1);

    return rows.length > 0;
  }

  async findByExamId({ examId }: FindResultadosIaByExamInput): Promise<ResultadoIa[]> {
    const rows = await db
      .select({
        idResultadoIa: resultadoIa.idResultadoIa,
        idImagem: resultadoIa.idImagem,
        predictedClass: resultadoIa.predictedClass,
        predictedLabel: resultadoIa.predictedLabel,
        confidence: resultadoIa.confidence,
        probabilities: resultadoIa.probabilities,
      })
      .from(resultadoIa)
      .innerJoin(imagem, eq(resultadoIa.idImagem, imagem.idImagem))
      .where(eq(imagem.idExame, examId));

    return rows.map((row) => ({
      id: row.idResultadoIa,
      idImagem: row.idImagem,
      predictedClass: row.predictedClass,
      predictedLabel: row.predictedLabel,
      confidence: row.confidence,
      probabilities: row.probabilities as Probabilities,
    }));
  }
}
