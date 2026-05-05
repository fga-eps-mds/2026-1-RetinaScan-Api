import { eq } from 'drizzle-orm';

import { db } from '@/infra/database/drizzle/connection';
import { imagem } from '@/infra/database/drizzle/schema';
import type { Imagem, LateralidadeOlho } from '@/modules/exam/imagem';
import type { FindImagensInput, ImagemRepository } from '@/modules/exam/imagem-repository';

export class DrizzleImagemRepository implements ImagemRepository {
  async findMany({ examId }: FindImagensInput): Promise<Imagem[]> {
    const rows = await db.select().from(imagem).where(eq(imagem.idExame, examId));

    return rows.map((row) => ({
      id: row.idImagem,
      idExame: row.idExame,
      lateralidadeOlho: row.lateralidadeOlho as LateralidadeOlho,
      caminhoImg: row.caminhoImg,
      qualidadeImg: row.qualidadeImg,
    }));
  }

  async createMany(imagens: Imagem[]): Promise<Imagem[]> {
    if (imagens.length === 0) return [];

    const rows = await db
      .insert(imagem)
      .values(
        imagens.map((img) => ({
          idImagem: img.id,
          idExame: img.idExame,
          lateralidadeOlho: img.lateralidadeOlho,
          caminhoImg: img.caminhoImg,
          qualidadeImg: img.qualidadeImg,
        })),
      )
      .returning();

    return rows.map((row) => ({
      id: row.idImagem,
      idExame: row.idExame,
      lateralidadeOlho: row.lateralidadeOlho as LateralidadeOlho,
      caminhoImg: row.caminhoImg,
      qualidadeImg: row.qualidadeImg,
    }));
  }
}
